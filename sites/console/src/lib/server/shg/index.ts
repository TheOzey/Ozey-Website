import "server-only";
import { Firestore } from "@google-cloud/firestore";
import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";
import { getConsoleSession } from "@/lib/server/session";
import { consoleCallerAccessToken } from "@/lib/server/workforce-admin";
import { decideShgRead, type SessionView } from "./core/access.ts";
import { InvalidCursorError } from "./core/cursor.ts";
import { ShgNotFoundError, ShgScaleLimitError } from "./core/data.ts";
import { createReaderTokenProvider, ShgCredentialError } from "./core/reader-credentials.ts";

/**
 * Server-side access to SHG data for the Ozey Console.
 *
 * Every /api/shg route runs through `shgRoute`, which enforces, in order:
 *   1. a valid Workforce session            → otherwise 401
 *   2. an active employee holding shg:read  → otherwise 403
 *   3. a short-lived SHG read credential    → otherwise 503 (never a fallback)
 * and only then runs a read-only query.
 *
 * Data source (SHG_DATA_SOURCE):
 *   impersonation (default) ozey-shg, as workforce-shg-reader via a ≤ 15-min
 *                 impersonated token. That identity holds only
 *                 datastore.entities.get/list. No keys, no Firebase Admin.
 *   emulator      LOCAL TESTS ONLY: the Firestore emulator (demo project).
 *                 Refused in production.
 */

const SHG_PROJECT_ID = process.env.SHG_PROJECT_ID ?? "ozey-shg";
const SHG_READER = process.env.SHG_READER_SERVICE_ACCOUNT ?? `workforce-shg-reader@${SHG_PROJECT_ID}.iam.gserviceaccount.com`;
const TOKEN_LIFETIME_S = 900;

type Source = "impersonation" | "emulator";

function dataSource(): Source {
  const value = process.env.SHG_DATA_SOURCE ?? "impersonation";
  if (value === "impersonation") return "impersonation";
  if (value === "emulator") {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL || !process.env.FIRESTORE_EMULATOR_HOST) {
      throw new ShgCredentialError("SHG_DATA_SOURCE=emulator is for local tests only");
    }
    return "emulator";
  }
  throw new ShgCredentialError(`Unknown SHG_DATA_SOURCE: ${value}`);
}

const readerTokens = createReaderTokenProvider({
  serviceAccount: SHG_READER,
  lifetimeSeconds: TOKEN_LIFETIME_S,
  callerToken: consoleCallerAccessToken,
  // The impersonation call is billed to the console's own project.
  quotaProject: process.env.GOOGLE_CLOUD_QUOTA_PROJECT || undefined,
});

let shgDb: Firestore | null = null;

/** Throws ShgCredentialError when no SHG read credential can be obtained. */
async function readyShgDb(): Promise<Firestore> {
  const source = dataSource();
  if (source === "emulator") {
    shgDb ??= new Firestore({ projectId: process.env.SHG_EMULATOR_PROJECT_ID ?? "demo-ozey-shg" });
    return shgDb;
  }
  // Mint (or reuse) the impersonated token first, so credential failure is a
  // clean 503 before any query runs.
  await readerTokens.getToken();
  if (!shgDb) {
    const authClient = new OAuth2Client();
    // Requests are made as the reader service account itself; never attach the
    // console's quota project to SHG calls.
    authClient.quotaProjectId = undefined;
    authClient.refreshHandler = async () => {
      const { token, expiresAt } = await readerTokens.getToken();
      return { access_token: token, expiry_date: expiresAt };
    };
    shgDb = new Firestore({ projectId: SHG_PROJECT_ID, authClient });
  }
  return shgDb;
}

function sessionView(session: Awaited<ReturnType<typeof getConsoleSession>>): SessionView {
  if (!session) return null;
  if (session.state !== "active") return { state: "inactive", reason: session.reason };
  return { state: "active", employeeId: session.employee.id, permissions: session.employee.permissions };
}

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** gRPC status codes that mean the SHG credential was rejected or lacks access. */
const CREDENTIAL_REJECTED = new Set([7 /* PERMISSION_DENIED */, 16 /* UNAUTHENTICATED */]);

export interface ShgRouteContext<P> {
  db: Firestore;
  params: P;
  search: URLSearchParams;
}

/** Wraps a read-only SHG route handler with authorization and fail-closed error mapping. */
export function shgRoute<P = Record<string, never>>(
  handler: (ctx: ShgRouteContext<P>) => Promise<unknown>,
) {
  return async (request: Request, context: { params: Promise<P> }) => {
    const decision = decideShgRead(sessionView(await getConsoleSession()));
    if (!decision.allowed) return json({ error: decision.error }, decision.status);

    let db: Firestore;
    try {
      db = await readyShgDb();
    } catch (error) {
      console.error("[shg] credential unavailable:", error instanceof Error ? error.message : error);
      return json({ error: "shg-unavailable" }, 503);
    }

    try {
      const params = context?.params ? await context.params : ({} as P);
      return json(await handler({ db, params, search: new URL(request.url).searchParams }));
    } catch (error) {
      if (error instanceof InvalidCursorError) return json({ error: "bad-request" }, 400);
      if (error instanceof ShgNotFoundError) return json({ error: "not-found" }, 404);
      if (error instanceof ShgScaleLimitError) return json({ error: "scale-limit" }, 503);
      if (error instanceof ShgCredentialError) return json({ error: "shg-unavailable" }, 503);
      const code = (error as { code?: unknown })?.code;
      if (typeof code === "number" && CREDENTIAL_REJECTED.has(code)) {
        readerTokens.invalidate();
        console.error("[shg] SHG rejected the read credential:", (error as Error).message);
        return json({ error: "shg-unavailable" }, 503);
      }
      console.error("[shg] query failed:", error);
      return json({ error: "internal" }, 500);
    }
  };
}
