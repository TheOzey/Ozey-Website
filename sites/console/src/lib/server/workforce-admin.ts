import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Firestore as CloudFirestore } from "@google-cloud/firestore";
import { type App, applicationDefault, type Credential, getApp, getApps, initializeApp } from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
import { type Firestore, getFirestore } from "firebase-admin/firestore";
import { OAuth2Client } from "google-auth-library";

/**
 * Admin access to the WORKFORCE project only (ozey-workforce[-dev]). This app
 * has no access to any product project, so the console server cannot read
 * product data through it. No key files are ever used.
 *
 * Credential modes (WORKFORCE_CREDENTIALS):
 *   adc     (default) Application Default Credentials — production uses Vercel
 *           Workload Identity Federation through this path.
 *   gcloud  LOCAL DEVELOPMENT ONLY. Short-lived access tokens from the
 *           developer's gcloud CLI login (`gcloud auth print-access-token`),
 *           because the dev project's organization blocks the ADC sign-in
 *           route. Refused in production and on Vercel. Requires
 *           GOOGLE_CLOUD_QUOTA_PROJECT=<workforce project>: Google APIs need a
 *           quota project for user credentials, and Firebase Admin's Auth
 *           client only sends one for ADC or via that variable.
 * Emulators: with FIREBASE_AUTH_EMULATOR_HOST set, no credentials are used.
 */
const APP_NAME = "workforce-admin";
const execFileAsync = promisify(execFile);

type CredentialMode = "emulator" | "adc" | "gcloud";

function credentialMode(): CredentialMode {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return "emulator";
  const mode = (process.env.WORKFORCE_CREDENTIALS ?? "adc").trim();
  if (mode === "adc") return "adc";
  if (mode === "gcloud") {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      throw new Error("WORKFORCE_CREDENTIALS=gcloud is for local development only");
    }
    if (process.env.GOOGLE_CLOUD_QUOTA_PROJECT !== projectId()) {
      throw new Error(
        `WORKFORCE_CREDENTIALS=gcloud requires GOOGLE_CLOUD_QUOTA_PROJECT=${projectId()} (see .env.example)`,
      );
    }
    return "gcloud";
  }
  throw new Error(`Unknown WORKFORCE_CREDENTIALS value: ${mode}`);
}

function projectId(): string {
  const id = process.env.WORKFORCE_PROJECT_ID;
  if (!id) throw new Error("WORKFORCE_PROJECT_ID is not set");
  return id;
}

// ── gcloud token bridge (local development only) ──────────────────────────────

// gcloud access tokens live ~60 min; treat them as valid for 45 and refresh early.
const TOKEN_LIFETIME_MS = 45 * 60 * 1000;
let cachedToken: { value: string; expiresAt: number } | null = null;
let pendingToken: Promise<{ value: string; expiresAt: number }> | null = null;

async function gcloudAccessToken(): Promise<{ value: string; expiresAt: number }> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) return cachedToken;
  // One gcloud invocation at a time, however many requests need a token.
  pendingToken ??= execFileAsync("gcloud", ["auth", "print-access-token"], { timeout: 30_000 })
    .then(({ stdout }) => {
      const value = stdout.trim();
      if (!value) throw new Error("gcloud returned no access token; run `gcloud auth login`");
      cachedToken = { value, expiresAt: Date.now() + TOKEN_LIFETIME_MS };
      return cachedToken;
    })
    .finally(() => {
      pendingToken = null;
    });
  return pendingToken;
}

/** Firebase Admin credential backed by the gcloud CLI login (Auth API calls). */
const gcloudCredential: Credential = {
  async getAccessToken() {
    const token = await gcloudAccessToken();
    return { access_token: token.value, expires_in: Math.floor((token.expiresAt - Date.now()) / 1000) };
  },
};

/** google-auth-library client backed by the gcloud CLI login (Firestore calls). */
function gcloudAuthClient(): OAuth2Client {
  const client = new OAuth2Client();
  client.quotaProjectId = projectId();
  client.refreshHandler = async () => {
    const token = await gcloudAccessToken();
    return { access_token: token.value, expiry_date: token.expiresAt };
  };
  return client;
}

// ── Accessors ─────────────────────────────────────────────────────────────────

function workforceApp(): App {
  if (getApps().some((app) => app.name === APP_NAME)) return getApp(APP_NAME);
  const mode = credentialMode();
  const options =
    mode === "emulator"
      ? { projectId: projectId() }
      : { projectId: projectId(), credential: mode === "gcloud" ? gcloudCredential : applicationDefault() };
  return initializeApp(options, APP_NAME);
}

export const workforceAuth = (): Auth => getAuth(workforceApp());

let gcloudFirestore: CloudFirestore | null = null;

export function workforceDb(): Firestore {
  if (credentialMode() !== "gcloud") return getFirestore(workforceApp());
  // Firebase Admin's Firestore accepts only key or ADC credentials, so in
  // gcloud mode the same @google-cloud/firestore client (the version
  // firebase-admin uses) is built directly with the token-backed auth client.
  gcloudFirestore ??= new CloudFirestore({ projectId: projectId(), authClient: gcloudAuthClient() });
  return gcloudFirestore;
}

export const workforceCredentialMode = (): CredentialMode => credentialMode();

/**
 * An access token for the console server's own identity (not a product
 * identity). Used only to impersonate product read identities such as the SHG
 * reader; it carries no product permissions of its own beyond Token Creator on
 * those specific service accounts. Throws in emulator mode: there is no real
 * identity to impersonate with.
 */
export async function consoleCallerAccessToken(): Promise<string> {
  const mode = credentialMode();
  if (mode === "gcloud") return (await gcloudAccessToken()).value;
  if (mode === "adc") {
    const { GoogleAuth } = await import("google-auth-library");
    const token = await new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] }).getAccessToken();
    if (!token) throw new Error("ADC returned no access token");
    return token;
  }
  throw new Error("No console identity in emulator mode");
}
