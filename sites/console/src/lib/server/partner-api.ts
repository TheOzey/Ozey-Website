import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { canManagePartners, canReadCommissions, canReadPartners } from "@/lib/partners/authorization";
import { isSameOrigin } from "./same-origin";
import { getConsoleSession } from "./session";

export interface PartnerActor {
  employeeId: string;
  permissions: readonly string[];
}

export const PARTNER_NUMBER_PARAM = /^OZEY-DS(?:T)?-\d{4,9}$/;

export const partnerJson = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

type PartnerAuthKind = "partners.read" | "partners.manage" | "commissions.read";

function permissionAllows(permissions: readonly string[], kind: PartnerAuthKind): boolean {
  if (kind === "partners.read") return canReadPartners(permissions);
  if (kind === "partners.manage") return canManagePartners(permissions);
  return canReadCommissions(permissions);
}

async function authorizePartner(
  request: NextRequest,
  kind: PartnerAuthKind,
): Promise<{ ok: true; actor: PartnerActor } | { ok: false; response: NextResponse }> {
  if (!isSameOrigin(request)) return { ok: false, response: partnerJson(403, { error: "cross-origin" }) };
  const session = await getConsoleSession();
  if (!session) return { ok: false, response: partnerJson(401, { error: "unauthenticated" }) };
  if (session.state !== "active") return { ok: false, response: partnerJson(403, { error: "inactive-employee" }) };
  if (!permissionAllows(session.employee.permissions, kind)) {
    return { ok: false, response: partnerJson(403, { error: "missing-permission" }) };
  }
  return { ok: true, actor: { employeeId: session.employee.id, permissions: session.employee.permissions } };
}

export const authorizePartnerMutation = (request: NextRequest) => authorizePartner(request, "partners.manage");
export const authorizePartnerRead = (request: NextRequest) => authorizePartner(request, "partners.read");
/** For future commission APIs — pages already enforce this independently. */
export const authorizeCommissionsRead = (request: NextRequest) => authorizePartner(request, "commissions.read");
