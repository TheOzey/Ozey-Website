import assert from "node:assert/strict";
import { test } from "node:test";
import { type EmployeeRecord, evaluateSignIn, type GateConfig, type SignInAttempt } from "./gate.js";

const v1: GateConfig = { allowedDomains: [], requireManagedAccount: false };
const managed: GateConfig = { allowedDomains: ["ozey.in"], requireManagedAccount: true };
const admin: EmployeeRecord = { id: "emp_1", email: "web.viru@gmail.com", status: "invited", authUid: null };
const lookup = (records: EmployeeRecord[]) => async (email: string) => records.filter((r) => r.email === email);
const attempt = (over: Partial<SignInAttempt> = {}): SignInAttempt => ({
  uid: "uid-1",
  providerId: "google.com",
  email: "web.viru@gmail.com",
  emailVerified: true,
  hostedDomain: undefined,
  ...over,
});
const denied = async (a: SignInAttempt, records: EmployeeRecord[], reason: string, cfg = v1) =>
  assert.deepEqual(await evaluateSignIn(a, cfg, lookup(records)), { allowed: false, reason });
const allowed = async (a: SignInAttempt, records: EmployeeRecord[], cfg = v1) =>
  assert.equal((await evaluateSignIn(a, cfg, lookup(records))).allowed, true);

// ── V1 policy: consumer Google accounts; the employee record is the allowlist ──
test("V1 admits the invited administrator's Google account", () => allowed(attempt(), [admin]));
test("V1 email matching is case-insensitive", () => allowed(attempt({ email: "Web.Viru@Gmail.com" }), [admin]));
test("V1 admits an active employee already linked to this uid", () =>
  allowed(attempt(), [{ ...admin, status: "active", authUid: "uid-1" }]));
test("V1 rejects any other Google account (no employee record)", () =>
  denied(attempt({ email: "someone.else@gmail.com" }), [admin], "not-an-employee"));
test("V1 rejects non-Google providers", () => denied(attempt({ providerId: "password" }), [admin], "provider-not-allowed"));
test("V1 rejects unverified email", () => denied(attempt({ emailVerified: false }), [admin], "email-not-verified"));
test("V1 rejects a missing or malformed email", async () => {
  await denied(attempt({ email: undefined }), [admin], "missing-email");
  await denied(attempt({ email: "not-an-email" }), [admin], "missing-email");
});
test("V1 rejects suspended employees", () => denied(attempt(), [{ ...admin, status: "suspended" }], "employee-suspended"));
test("V1 rejects offboarded employees", () => denied(attempt(), [{ ...admin, status: "offboarded" }], "employee-offboarded"));
test("V1 rejects a record linked to a different Google account", () =>
  denied(attempt(), [{ ...admin, status: "active", authUid: "someone-else" }], "linked-to-another-account"));
test("V1 rejects ambiguous duplicate records", () =>
  denied(attempt(), [admin, { ...admin, id: "emp_2" }], "duplicate-employee-records"));

// ── Future managed-domain policy (configuration only) ──
const staff: EmployeeRecord = { id: "emp_3", email: "a@ozey.in", status: "active", authUid: null };
test("managed policy admits a managed ozey.in account", () =>
  allowed(attempt({ email: "a@ozey.in", hostedDomain: "ozey.in" }), [staff], managed));
test("managed policy rejects other domains even with a record", () => denied(attempt(), [admin], "wrong-domain", managed));
test("managed policy rejects look-alike domains", () =>
  denied(attempt({ email: "a@notozey.in", hostedDomain: "notozey.in" }), [staff], "wrong-domain", managed));
test("managed policy rejects consumer accounts without the hd claim", () =>
  denied(attempt({ email: "a@ozey.in" }), [staff], "not-a-managed-account", managed));
