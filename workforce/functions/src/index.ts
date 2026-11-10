import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { defineString } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions";
import { type AuthBlockingEvent, beforeUserCreated, beforeUserSignedIn, HttpsError } from "firebase-functions/v2/identity";
import { type EmployeeRecord, evaluateSignIn } from "./gate.js";

initializeApp();
const db = getFirestore();

// Admission policy (see gate.ts). V1: "any" domain + consumer accounts allowed,
// so only explicitly created employee records can sign in.
const ALLOWED_EMAIL_DOMAINS = defineString("WORKFORCE_ALLOWED_EMAIL_DOMAINS", { default: "any" });
const REQUIRE_MANAGED_ACCOUNT = defineString("WORKFORCE_REQUIRE_MANAGED_ACCOUNT", { default: "false" });

function gateConfig() {
  const domains = ALLOWED_EMAIL_DOMAINS.value().trim().toLowerCase();
  return {
    allowedDomains: domains === "any" ? [] : domains.split(",").map((d) => d.trim()).filter(Boolean),
    // The emulator's fake Google provider cannot issue an `hd` claim.
    requireManagedAccount: REQUIRE_MANAGED_ACCOUNT.value() === "true" && process.env.FUNCTIONS_EMULATOR !== "true",
  };
}
// Run as a dedicated least-privilege account, never the Editor-level default
// compute account. Set per project in functions/.env.<projectId>; the invalid
// default makes a deploy to an unconfigured project fail instead of falling back.
const FUNCTIONS_SERVICE_ACCOUNT = defineString("FUNCTIONS_SERVICE_ACCOUNT", {
  default: "unset-see-functions-env@invalid.iam.gserviceaccount.com",
});
const REGION = "asia-south1";
setGlobalOptions({ region: REGION, serviceAccount: FUNCTIONS_SERVICE_ACCOUNT, maxInstances: 5 });

async function findEmployeesByEmail(email: string): Promise<EmployeeRecord[]> {
  const snap = await db.collection("employees").where("email", "==", email).limit(2).get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return { id: doc.id, email: d.email, status: d.status, authUid: d.authUid ?? null };
  });
}

async function admit(event: AuthBlockingEvent, stage: "create" | "sign-in"): Promise<EmployeeRecord> {
  const user = event.data;
  const result = await evaluateSignIn(
    {
      uid: user?.uid ?? "",
      providerId: event.additionalUserInfo?.providerId ?? event.credential?.providerId,
      email: user?.email,
      emailVerified: user?.emailVerified ?? false,
      hostedDomain: event.additionalUserInfo?.profile?.hd,
    },
    gateConfig(),
    findEmployeesByEmail,
  );

  if (!result.allowed) {
    logger.warn("workforce sign-in denied", { stage, reason: result.reason, email: user?.email });
    await db.collection("auditLog").add({
      at: FieldValue.serverTimestamp(),
      action: "sign-in-denied",
      actor: null,
      target: user?.email ?? null,
      reason: result.reason,
      stage,
    });
    // Deliberately generic: do not reveal which check failed to the client.
    throw new HttpsError("permission-denied", "This account is not an authorised Ozey employee.");
  }
  return result.employee;
}

/** Runs before a new Auth account is created. Unknown accounts are never created. */
export const workforceBeforeCreate = beforeUserCreated({ region: REGION }, async (event) => {
  await admit(event, "create");
});

/** Runs on every sign-in: re-validates, links the uid, activates invited employees. */
export const workforceBeforeSignIn = beforeUserSignedIn({ region: REGION }, async (event) => {
  const employee = await admit(event, "sign-in");
  const uid = event.data?.uid ?? "";
  await db.runTransaction(async (tx) => {
    const ref = db.collection("employees").doc(employee.id);
    const fresh = await tx.get(ref);
    const current = fresh.data();
    // Re-check inside the transaction so a concurrent link cannot be overwritten.
    if (!current || (current.authUid && current.authUid !== uid)) {
      throw new HttpsError("permission-denied", "This account is not an authorised Ozey employee.");
    }
    tx.update(ref, {
      authUid: uid,
      status: current.status === "invited" ? "active" : current.status,
      lastSignInAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(db.collection("auditLog").doc(), {
      at: FieldValue.serverTimestamp(),
      action: "signed-in",
      actor: employee.id,
      target: employee.id,
    });
  });
});
