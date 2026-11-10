import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { type Employee, getEmployeeByAuthUid } from "./employees";
import { workforceAuth } from "./workforce-admin";

export const SESSION_COOKIE = "ozey_console_session";
export const SESSION_PATH = "/dashboard";
/** Absolute session lifetime. Re-authentication with Google after this. */
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
/** A session may only be created from a Google sign-in this recent. */
export const MAX_SIGN_IN_AGE_S = 5 * 60;

export type ConsoleSession =
  | { state: "active"; uid: string; employee: Employee }
  | { state: "inactive"; reason: "not-an-employee" | "suspended" | "offboarded" | "invited" };

/**
 * The verified console session for this request, or null when there is none.
 *
 * Every call verifies the session cookie's signature and expiry AND asks
 * Firebase whether it was revoked (`checkRevoked`), then re-reads the
 * employee record (≤ 60 s cache). Suspension therefore applies to the next
 * request, not the next sign-in. Memoised per request with React `cache`.
 */
export const getConsoleSession = cache(async (): Promise<ConsoleSession | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;

  let uid: string;
  try {
    uid = (await workforceAuth().verifySessionCookie(value, true)).uid;
  } catch {
    return null;
  }

  const employee = await getEmployeeByAuthUid(uid);
  if (!employee) return { state: "inactive", reason: "not-an-employee" };
  if (employee.status !== "active") return { state: "inactive", reason: employee.status };
  return { state: "active", uid, employee };
});
