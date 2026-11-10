#!/usr/bin/env node
// Seeds the Ozey Workforce permission model and the FIRST employee.
//
//   node scripts/seed-dev.mjs --project project-5dedabbe-2c9d-433a-a40 --email web.viru@gmail.com            # dry run
//   node scripts/seed-dev.mjs --project project-5dedabbe-2c9d-433a-a40 --email web.viru@gmail.com --yes      # apply
//
// Idempotent: products/roles are upserted; the employee is created only if no
// employee with that email exists. Refuses any project not on the allowlist
// (production `ozey-workforce` is intentionally not on it yet).
// Credentials (--credentials):
//   adc     (default) Application Default Credentials.
//   gcloud  short-lived access tokens from your gcloud CLI login
//           (`gcloud auth print-access-token`). Needed for the dev project,
//           whose organization blocks the ADC sign-in route. No key files.
// With FIRESTORE_EMULATOR_HOST set, the emulator is used and no credentials are needed.

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";

const require = createRequire(new URL("../functions/package.json", import.meta.url));
const { FieldValue, Firestore } = require("@google-cloud/firestore");
const { OAuth2Client } = require("google-auth-library");

// "project-5dedabbe-2c9d-433a-a40" is the repurposed, empty project now named "Ozey Workforce Dev".
const ALLOWED_PROJECTS = ["project-5dedabbe-2c9d-433a-a40", "demo-ozey-workforce"];

// The permission vocabulary each product owns, and product-scoped roles.
// There is deliberately no wildcard permission and no cross-product role.
const PRODUCTS = {
  // V1 console is read-only: shg:write is intentionally not part of the
  // vocabulary until write operations are deliberately added.
  shg: { permissions: ["shg:read"], backend: "firebase" },
  console: {
    permissions: [
      "console:employees.manage",
      "console:audit.read",
      "console:partners.read",
      "console:partners.manage",
      "console:commissions.read",
      "console:commissions.settle",
    ],
    backend: "console",
  },
};
const ROLES = {
  // displayName is display only; employees store, and authorization reads, the role id.
  "shg-viewer": { displayName: "SHG Viewer", product: "shg", permissions: ["shg:read"], description: "Read-only SHG visibility" },
  "console-admin": {
    displayName: "Console Administrator",
    product: "console",
    permissions: [
      "console:employees.manage",
      "console:audit.read",
      "console:partners.read",
      "console:partners.manage",
      "console:commissions.read",
      "console:commissions.settle",
    ],
    description: "Manage employees and partners; read audit and commission views. Grants no product data.",
  },
};
const FIRST_EMPLOYEE_ROLES = ["console-admin", "shg-viewer"];

const { values } = parseArgs({
  options: {
    project: { type: "string" },
    email: { type: "string" },
    name: { type: "string", default: "Ozey Console Administrator" },
    yes: { type: "boolean", default: false },
    credentials: { type: "string", default: "adc" },
  },
});
if (!["adc", "gcloud"].includes(values.credentials)) {
  console.error("error: --credentials must be adc or gcloud");
  process.exit(1);
}
if (values.credentials === "gcloud" && process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("error: --credentials gcloud cannot be combined with FIRESTORE_EMULATOR_HOST");
  process.exit(1);
}
if (!values.project || !ALLOWED_PROJECTS.includes(values.project)) {
  console.error(`error: --project must be one of ${ALLOWED_PROJECTS.join(", ")}`);
  process.exit(1);
}
const email = values.email?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("error: --email must be the employee's Google account email");
  process.exit(1);
}

function gcloudAuthClient() {
  const client = new OAuth2Client();
  client.refreshHandler = async () => ({
    access_token: execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim(),
    expiry_date: Date.now() + 45 * 60 * 1000,
  });
  return client;
}
const db = new Firestore({
  projectId: values.project,
  ...(values.credentials === "gcloud" ? { authClient: gcloudAuthClient() } : {}),
});

const existing = await db.collection("employees").where("email", "==", email).get();
const employeeId = existing.empty ? `emp_${randomBytes(9).toString("base64url")}` : existing.docs[0].id;

console.log(`Project: ${values.project}${process.env.FIRESTORE_EMULATOR_HOST ? "  (emulator)" : `  (credentials: ${values.credentials})`}`);
for (const [key, doc] of Object.entries(PRODUCTS)) console.log(`  upsert products/${key}  ${JSON.stringify(doc.permissions)}`);
for (const [key, doc] of Object.entries(ROLES)) console.log(`  upsert roles/${key}  ${JSON.stringify(doc.permissions)}`);
console.log(
  existing.empty
    ? `  create employees/${employeeId}  ${email}  status=invited  roles=${JSON.stringify(FIRST_EMPLOYEE_ROLES)}`
    : `  keep   employees/${employeeId}  (already exists; unchanged)`,
);
if (!values.yes) {
  console.log("\nDry run. Re-run with --yes to apply.");
  process.exit(0);
}

const batch = db.batch();
const now = FieldValue.serverTimestamp();
for (const [key, doc] of Object.entries(PRODUCTS)) batch.set(db.doc(`products/${key}`), { ...doc, updatedAt: now }, { merge: true });
for (const [key, doc] of Object.entries(ROLES)) batch.set(db.doc(`roles/${key}`), { ...doc, updatedAt: now }, { merge: true });
if (existing.empty) {
  batch.create(db.doc(`employees/${employeeId}`), {
    email,
    displayName: values.name,
    status: "invited",
    roles: FIRST_EMPLOYEE_ROLES,
    authUid: null,
    createdAt: now,
    createdBy: "seed-script",
    updatedAt: now,
    updatedBy: "seed-script",
    lastSignInAt: null,
  });
  batch.create(db.collection("auditLog").doc(), {
    at: now,
    action: "employee-created",
    actor: "seed-script",
    target: employeeId,
    roles: FIRST_EMPLOYEE_ROLES,
  });
}
await batch.commit();
console.log("\nApplied.");
