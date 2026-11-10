import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { workforceAuth, workforceDb } from "./workforce-admin";

/**
 * Server-side employee admission, run by the session endpoint on every sign-in.
 *
 * Mirrors the rules in workforce/functions/src/gate.ts. In the no-billing dev
 * setup (option A) there are no blocking functions, so this is where a Google
 * identity is matched to its employee record, linked, and activated. With
 * blocking functions deployed it runs as a second, independent check.
 *
 * Admitted only when: Google provider, verified email, exactly one employee
 * record with that email, status invited|active, and the record unlinked or
 * already linked to this uid. Optional domain policy via env:
 *   WORKFORCE_ALLOWED_EMAIL_DOMAINS  "any" (default) or "ozey.in,…"
 */
export type AdmissionResult =
  | { admitted: true; employeeId: string }
  | { admitted: false; reason: string };

function allowedDomains(): string[] {
  const raw = (process.env.WORKFORCE_ALLOWED_EMAIL_DOMAINS ?? "any").trim().toLowerCase();
  return raw === "any" ? [] : raw.split(",").map((d) => d.trim()).filter(Boolean);
}

export async function admitEmployee(token: DecodedIdToken): Promise<AdmissionResult> {
  const deny = (reason: string): AdmissionResult => ({ admitted: false, reason });
  const email = token.email?.trim().toLowerCase();

  if (token.firebase.sign_in_provider !== "google.com") return deny("provider-not-allowed");
  if (!email) return deny("missing-email");
  if (token.email_verified !== true) return deny("email-not-verified");
  const domains = allowedDomains();
  if (domains.length > 0 && !domains.includes(email.split("@")[1])) return deny("wrong-domain");

  const db = workforceDb();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(db.collection("employees").where("email", "==", email).limit(2));
    if (snap.size === 0) return deny("not-an-employee");
    if (snap.size > 1) return deny("duplicate-employee-records");

    const doc = snap.docs[0];
    const status = doc.get("status");
    const linked = doc.get("authUid") as string | null;
    if (status !== "invited" && status !== "active") return deny(`employee-${status}`);
    if (linked && linked !== token.uid) return deny("linked-to-another-account");

    tx.update(doc.ref, {
      authUid: token.uid,
      status: "active",
      lastSignInAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(db.collection("auditLog").doc(), {
      at: FieldValue.serverTimestamp(),
      action: status === "invited" ? "employee-activated" : "signed-in",
      actor: doc.id,
      target: doc.id,
    });
    return { admitted: true, employeeId: doc.id };
  });
}

/**
 * Removes the Auth record of a Google account that was refused, so non-employees
 * leave nothing behind. Never deletes an account linked to any employee record.
 */
export async function discardRefusedAccount(uid: string): Promise<boolean> {
  const linked = await workforceDb().collection("employees").where("authUid", "==", uid).limit(1).get();
  if (!linked.empty) return false;
  await workforceAuth().deleteUser(uid);
  return true;
}
