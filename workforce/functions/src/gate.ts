/**
 * Workforce admission rules, kept free of Firebase imports so they can be
 * unit-tested. See OZEY_WORKFORCE_ARCHITECTURE.md §4.
 *
 * A sign-in is admitted only when ALL hold:
 *   1. the provider is Google;
 *   2. Google reports the email as verified;
 *   3. if allowed domains are configured, the email is on one of them;
 *   4. if managed accounts are required, Google's `hd` claim equals the
 *      email's domain (Workspace / Cloud Identity accounts only);
 *   5. exactly one employee record has that email, with status invited|active;
 *   6. that record is unlinked or already linked to this Firebase uid.
 *
 * V1 runs with no domain restriction and consumer accounts allowed, so the
 * employee record (rule 5) is the allowlist: only explicitly created
 * employees can ever sign in. Rules 3–4 switch on by configuration when Ozey
 * adopts a managed domain; no code change is needed.
 */

export type EmployeeStatus = "invited" | "active" | "suspended" | "offboarded";

export interface EmployeeRecord {
  id: string;
  email: string;
  status: EmployeeStatus;
  authUid: string | null;
}

export interface SignInAttempt {
  uid: string;
  providerId: string | undefined;
  email: string | undefined;
  emailVerified: boolean;
  /** Google's hosted-domain claim for managed (Workspace / Cloud Identity) accounts. */
  hostedDomain: string | undefined;
}

export interface GateConfig {
  /** Lower-case email domains allowed to sign in. Empty = any domain (employee record is the allowlist). */
  allowedDomains: string[];
  /** Require Google's hosted-domain (`hd`) claim to match the email's domain. */
  requireManagedAccount: boolean;
}

export type GateResult =
  | { allowed: true; employee: EmployeeRecord }
  | { allowed: false; reason: string };

export async function evaluateSignIn(
  attempt: SignInAttempt,
  config: GateConfig,
  findEmployeesByEmail: (email: string) => Promise<EmployeeRecord[]>,
): Promise<GateResult> {
  const deny = (reason: string): GateResult => ({ allowed: false, reason });
  const email = attempt.email?.trim().toLowerCase();

  if (attempt.providerId !== "google.com") return deny("provider-not-allowed");
  if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) return deny("missing-email");
  if (!attempt.emailVerified) return deny("email-not-verified");
  const domain = email.split("@")[1];
  if (config.allowedDomains.length > 0 && !config.allowedDomains.includes(domain)) return deny("wrong-domain");
  if (config.requireManagedAccount && attempt.hostedDomain?.toLowerCase() !== domain) {
    return deny("not-a-managed-account");
  }

  const matches = await findEmployeesByEmail(email);
  if (matches.length === 0) return deny("not-an-employee");
  if (matches.length > 1) return deny("duplicate-employee-records");

  const employee = matches[0];
  if (employee.status !== "invited" && employee.status !== "active") return deny(`employee-${employee.status}`);
  if (employee.authUid && employee.authUid !== attempt.uid) return deny("linked-to-another-account");

  return { allowed: true, employee };
}
