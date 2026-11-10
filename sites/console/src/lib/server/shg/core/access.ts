/**
 * The SHG read authorization decision, as a pure function so every branch is
 * unit-tested. Applied server-side to every /api/shg request, independently of
 * what the UI shows.
 */
export type SessionView =
  | null
  | { state: "inactive"; reason: string }
  | { state: "active"; employeeId: string; permissions: readonly string[] };

export type AccessDecision =
  | { allowed: true; employeeId: string }
  | { allowed: false; status: 401 | 403; error: "unauthenticated" | "inactive-employee" | "missing-permission" };

export const SHG_READ = "shg:read";

export function decideShgRead(session: SessionView): AccessDecision {
  if (session === null) return { allowed: false, status: 401, error: "unauthenticated" };
  if (session.state !== "active") return { allowed: false, status: 403, error: "inactive-employee" };
  if (!session.permissions.includes(SHG_READ)) return { allowed: false, status: 403, error: "missing-permission" };
  return { allowed: true, employeeId: session.employeeId };
}
