#!/usr/bin/env node
// Grants or revokes Ozey Console access by setting the `ozeyStaff` custom
// claim on a Firebase Auth user in the SHG project.
//
// This is an administrator tool. It runs on a trusted machine with Admin
// credentials and is never bundled into the web app:
//
//   gcloud auth application-default login          # or GOOGLE_APPLICATION_CREDENTIALS=/path/key.json
//   pnpm grant-staff --project ozey-shg --phone +919876543210            # dry run: shows the change
//   pnpm grant-staff --project ozey-shg --phone +919876543210 --yes      # applies it
//   pnpm grant-staff --project ozey-shg --uid <uid> --revoke --yes
//
// The user picks up the change on their next token refresh ("Check again" on
// the console's access screen, or sign out and back in).
//
// Other custom claims on the account are preserved.

import { parseArgs } from "node:util";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const { values } = parseArgs({
  options: {
    project: { type: "string" },
    uid: { type: "string" },
    phone: { type: "string" },
    revoke: { type: "boolean", default: false },
    yes: { type: "boolean", default: false },
  },
});

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

if (!values.project) fail("--project is required (e.g. --project ozey-shg).");
if (!values.uid === !values.phone) fail("pass exactly one of --uid or --phone.");

const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
initializeApp(emulator ? { projectId: values.project } : { credential: applicationDefault(), projectId: values.project });
const auth = getAuth();

const user = values.uid ? await auth.getUser(values.uid) : await auth.getUserByPhoneNumber(values.phone);
const current = user.customClaims ?? {};
const next = { ...current };
if (values.revoke) delete next.ozeyStaff;
else next.ozeyStaff = true;

console.log(`Project : ${values.project}${emulator ? `  (emulator ${emulator})` : ""}`);
console.log(`User    : ${user.uid}  ${user.phoneNumber ?? ""}`);
console.log(`Claims  : ${JSON.stringify(current)}  →  ${JSON.stringify(next)}`);

if (!values.yes) {
  console.log("\nDry run. Re-run with --yes to apply.");
  process.exit(0);
}

await auth.setCustomUserClaims(user.uid, next);
console.log(values.revoke ? "\nAccess revoked." : "\nAccess granted.");
if (values.revoke) {
  // Revoking a claim only takes effect when the token refreshes (≤ 1 hour).
  // Revoking refresh tokens forces a re-sign-in so it applies immediately.
  await auth.revokeRefreshTokens(user.uid);
  console.log("Refresh tokens revoked. The user must sign in again.");
}
