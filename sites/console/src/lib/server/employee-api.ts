import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { EMPLOYEES_MANAGE, hasPermission, type Permission } from "@/lib/permissions/permissions";
import { isSameOrigin } from "./same-origin";
import { getConsoleSession } from "./session";

export interface EmployeeMutationActor {
  employeeId: string;
  permissions: readonly string[];
}

/**
 * Shared guard for every employee mutation (create, edit, delete). Fails
 * closed, in order: cross-origin → 403; no session → 401; inactive employee or
 * missing console:employees.manage → 403. Returns the acting employee's id and
 * permissions.
 *
 * This path uses only the Workforce session and Workforce Admin client; it has
 * no dependency on the SHG project, its data layer or its reader identity
 * (enforced by tests/unit/boundary.test.ts).
 */
export async function authorizeEmployeeMutation(
  request: NextRequest,
): Promise<{ ok: true; actor: EmployeeMutationActor } | { ok: false; response: NextResponse }> {
  if (!isSameOrigin(request)) return { ok: false, response: employeeJson(403, { error: "cross-origin" }) };
  const session = await getConsoleSession();
  if (!session) return { ok: false, response: employeeJson(401, { error: "unauthenticated" }) };
  if (session.state !== "active") return { ok: false, response: employeeJson(403, { error: "inactive-employee" }) };
  if (!hasPermission(session.employee.permissions, EMPLOYEES_MANAGE)) {
    return { ok: false, response: employeeJson(403, { error: "missing-permission" }) };
  }
  return { ok: true, actor: { employeeId: session.employee.id, permissions: session.employee.permissions } };
}

export function actorHas(actor: EmployeeMutationActor, permission: Permission): boolean {
  return hasPermission(actor.permissions, permission);
}

export const employeeJson = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Employee numbers are the only employee identifier the API accepts. */
export const EMPLOYEE_NUMBER_PARAM = /^EMP-\d{4,9}$/;
