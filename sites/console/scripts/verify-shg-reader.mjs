#!/usr/bin/env node
// READ-ONLY security verification of the SHG read identity used by the Ozey Console.
//
//   node scripts/verify-shg-reader.mjs
//
// Impersonates workforce-shg-reader@ozey-shg via your gcloud login (short-lived
// token, no keys) and proves:
//   A. it can read every SHG collection the console needs;
//   B. it cannot create / update / delete. Write probes are built so they can
//      NEVER change data even if IAM were wrong: each carries a precondition
//      that must fail (create → on an EXISTING doc with exists:false;
//      update/delete → on a MISSING doc with exists:true). The only possible
//      outcomes are PERMISSION_DENIED (correct) or a precondition error;
//   C. the token is useless outside SHG Firestore;
//   D. the identity has no user-managed private keys;
//   E. the token is short-lived and issued through impersonation.
// Prints no document contents.

import { execFileSync } from "node:child_process";

const SHG = "ozey-shg";
const OTHER_PROJECT = "project-5dedabbe-2c9d-433a-a40"; // Ozey Workforce Dev
const READER = `workforce-shg-reader@${SHG}.iam.gserviceaccount.com`;
const DATASTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const LIFETIME_S = 900;
// iamcredentials is enabled on the workforce project; bill the impersonation call there.
const QUOTA_PROJECT = OTHER_PROJECT;
const DB = `projects/${SHG}/databases/(default)/documents`;

let passed = 0;
let failed = 0;
const check = (ok, label, detail = "") => {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};

const callerToken = () => execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim();

async function impersonate(scopes, lifetime = `${LIFETIME_S}s`) {
  for (let attempt = 1; attempt <= 12; attempt++) {
    const res = await fetch(
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${READER}:generateAccessToken`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${callerToken()}`,
          "x-goog-user-project": QUOTA_PROJECT,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scope: scopes, lifetime }),
      },
    );
    const body = await res.json();
    if (res.ok) return body;
    // New IAM bindings can take a few minutes to propagate.
    if (res.status === 403 && attempt < 12) {
      await new Promise((r) => setTimeout(r, 15_000));
      continue;
    }
    throw new Error(`generateAccessToken ${res.status}: ${body.error?.message}`);
  }
}

const fs = (token, path, init = {}) =>
  fetch(`https://firestore.googleapis.com/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

async function runQuery(token, collectionId, allDescendants) {
  const res = await fs(token, `${DB}:runQuery`, {
    method: "POST",
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId, allDescendants }], limit: 1 } }),
  });
  const body = await res.json();
  const docs = Array.isArray(body) ? body.filter((r) => r.document) : [];
  return { status: res.status, found: docs.length, name: docs[0]?.document?.name, error: body.error?.status ?? body[0]?.error?.status };
}

console.log(`SHG read identity: ${READER}\n`);

// ── E. token issuance ─────────────────────────────────────────────────────────
console.log("E. Short-lived token via impersonation");
const issued = await impersonate([DATASTORE_SCOPE]);
const token = issued.accessToken;
const info = await (await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`)).json();
const ttl = Number(info.expires_in);
check(issued.expireTime !== undefined, "issued by iamcredentials generateAccessToken (impersonation)", `expires ${issued.expireTime}`);
check(info.email === READER || info.azp !== undefined, "token principal is the reader service account", info.email ?? `azp ${info.azp}`);
check(ttl > 0 && ttl <= LIFETIME_S, `lifetime ≤ ${LIFETIME_S}s`, `${ttl}s remaining`);
check(info.scope === DATASTORE_SCOPE, "scope limited to Firestore/Datastore", info.scope);

// ── A. reads ──────────────────────────────────────────────────────────────────
console.log("\nA. Reads (one document per collection, contents not printed)");
const groups = await runQuery(token, "groups", false);
check(groups.status === 200, "groups", `HTTP ${groups.status}, ${groups.found} doc`);
for (const c of ["members", "savings", "repayments", "loans", "monthlyCharges", "meetings", "monthlyClosures", "openingBalance", "ruleVersions"]) {
  const r = await runQuery(token, c, true);
  check(r.status === 200, c, `HTTP ${r.status}, ${r.found} doc${r.error ? `, ${r.error}` : ""}`);
}
const agg = await fs(token, `${DB}:runAggregationQuery`, {
  method: "POST",
  body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: { from: [{ collectionId: "groups" }] }, aggregations: [{ alias: "n", count: {} }] } }),
});
check(agg.status === 200, "aggregation (count of groups)", `HTTP ${agg.status}`);

// ── B. write denial (precondition-guarded: cannot change data) ────────────────
console.log("\nB. Writes denied (each probe is guaranteed to fail even if permitted)");
const existingDoc = groups.name; // a real group document path; never modified
const missingDoc = `${DB}/groups/ozey-console-iam-probe-does-not-exist`;
const missing = await fs(token, missingDoc);
check(missing.status === 404, "probe target for update/delete does not exist", `HTTP ${missing.status}`);
const commit = (write) => fs(token, `${DB}:commit`, { method: "POST", body: JSON.stringify({ writes: [write] }) });
const probes = [
  ["create", existingDoc && { update: { name: existingDoc, fields: {} }, currentDocument: { exists: false } }],
  ["update", { update: { name: missingDoc, fields: {} }, updateMask: { fieldPaths: [] }, currentDocument: { exists: true } }],
  ["delete", { delete: missingDoc, currentDocument: { exists: true } }],
];
for (const [op, write] of probes) {
  if (!write) {
    check(false, `${op} denied`, "no existing document available for the guarded create probe");
    continue;
  }
  const res = await commit(write);
  const body = await res.json();
  check(res.status === 403 && body.error?.status === "PERMISSION_DENIED", `${op} denied`, `HTTP ${res.status} ${body.error?.status}`);
}
const iamToken = (await impersonate(["https://www.googleapis.com/auth/cloud-platform"], "300s")).accessToken;
const wanted = [
  "datastore.entities.get", "datastore.entities.list",
  "datastore.entities.create", "datastore.entities.update", "datastore.entities.delete",
  "datastore.databases.getMetadata", "iam.serviceAccounts.getAccessToken", "resourcemanager.projects.setIamPolicy",
];
const granted = (await (await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${SHG}:testIamPermissions`, {
  method: "POST",
  headers: { Authorization: `Bearer ${iamToken}`, "Content-Type": "application/json" },
  body: JSON.stringify({ permissions: wanted }),
})).json()).permissions ?? [];
check(
  JSON.stringify([...granted].sort()) === JSON.stringify(["datastore.entities.get", "datastore.entities.list"]),
  "effective permissions on ozey-shg are exactly entities.get + entities.list",
  JSON.stringify(granted),
);

// ── C. isolation ──────────────────────────────────────────────────────────────
console.log("\nC. Token unusable outside SHG Firestore");
const other = await fs(token, `projects/${OTHER_PROJECT}/databases/(default)/documents:runQuery`, {
  method: "POST",
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "employees" }], limit: 1 } }),
});
check(other.status === 403, "Firestore of Ozey Workforce Dev denied", `HTTP ${other.status}`);
const elsewhere = [
  ["Cloud Storage (ozey-shg buckets)", `https://storage.googleapis.com/storage/v1/b?project=${SHG}`],
  ["Firebase Auth admin (ozey-shg users)", `https://identitytoolkit.googleapis.com/v1/projects/${SHG}/accounts:query`, { method: "POST", body: "{}" }],
  ["Resource Manager (ozey-shg IAM policy)", `https://cloudresourcemanager.googleapis.com/v1/projects/${SHG}:getIamPolicy`, { method: "POST", body: "{}" }],
];
for (const [label, url, init = {}] of elsewhere) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  check(res.status === 401 || res.status === 403, `${label} denied`, `HTTP ${res.status}`);
}
const bogus = await fs("ya29.invalid-token", `${DB}:runQuery`, { method: "POST", body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "groups" }], limit: 1 } }) });
check(bogus.status === 401, "invalid token rejected", `HTTP ${bogus.status}`);

// ── D. keys ───────────────────────────────────────────────────────────────────
console.log("\nD. No private key");
const keys = execFileSync("gcloud", ["iam", "service-accounts", "keys", "list", `--iam-account=${READER}`, "--managed-by=user", "--format=value(name)"], { encoding: "utf8" }).trim();
check(keys === "", "no user-managed keys on the reader identity", keys ? keys.split("\n").length + " found" : "0 found");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
