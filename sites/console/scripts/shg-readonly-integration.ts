#!/usr/bin/env node
// READ-ONLY integration test against the real ozey-shg project.
//
//   node scripts/shg-readonly-integration.ts
//
// Runs the console's actual SHG data layer (src/lib/server/shg/core/data.ts)
// as workforce-shg-reader, impersonated with your gcloud login (≤ 15-minute
// token, Firestore scope, no keys) — exactly the server's production path.
// The data layer contains no write calls and the reader identity has only
// datastore.entities.get/list. Prints counts and structural checks only: no
// names, phone numbers or other personal data.

import { execFileSync } from "node:child_process";
import { Firestore } from "@google-cloud/firestore";
import { OAuth2Client } from "google-auth-library";
import * as data from "../src/lib/server/shg/core/data.ts";
import { createReaderTokenProvider } from "../src/lib/server/shg/core/reader-credentials.ts";

const READER = "workforce-shg-reader@ozey-shg.iam.gserviceaccount.com";
const QUOTA_PROJECT = "project-5dedabbe-2c9d-433a-a40"; // billed for the impersonation call only

const tokens = createReaderTokenProvider({
  serviceAccount: READER,
  lifetimeSeconds: 900,
  quotaProject: QUOTA_PROJECT,
  callerToken: async () => execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim(),
});
const authClient = new OAuth2Client();
authClient.quotaProjectId = undefined;
authClient.refreshHandler = async () => {
  const t = await tokens.getToken();
  return { access_token: t.token, expiry_date: t.expiresAt };
};
const db = new Firestore({ projectId: "ozey-shg", authClient });

let passed = 0;
let failed = 0;
async function step<T>(label: string, run: () => Promise<T>, describe: (r: T) => string, ok: (r: T) => boolean = () => true) {
  try {
    const result = await run();
    const good = ok(result);
    if (good) passed++;
    else failed++;
    console.log(`  ${good ? "PASS" : "FAIL"} ${label} — ${describe(result)}`);
    return result;
  } catch (error) {
    failed++;
    console.log(`  FAIL ${label} — ${(error as Error).name}: ${(error as Error).message.slice(0, 160)}`);
    return null;
  }
}

const t0 = await tokens.getToken();
console.log(`Impersonated ${READER}; token valid ${Math.round((t0.expiresAt - Date.now()) / 1000)} s\n`);

const overview = await step("overview", () => data.getOverview(db), (o) =>
  `${o.groups} groups, ${o.members.active} active members, savings ₹${o.savings.total} (₹${o.savings.opening} opening + ₹${o.savings.recorded} recorded), loans ₹${o.loans.totalRecorded}, outstanding ₹${o.loans.outstandingPrincipal}, top groups ${o.topGroupsBySavings.length}`,
  (o) => o.groups >= 1 && o.topGroupsBySavings.length === Math.min(o.groups, 10));
const groups = await step("groups list (with per-row financials)", () => data.listGroups(db, {}), (p) =>
  `${p.items.length} rows, financials present on all: ${p.items.every((g) => typeof g.financials.savings.total === "number")}`,
  (p) => p.items.length === overview?.groups && p.items.every((g) => typeof g.financials.loans.totalRecorded === "number"));
const gid = groups?.items[0]?.id;
if (gid) {
  await step("group detail (no bank details / secrets in payload)", () => data.getGroupDetail(db, gid), (d) =>
    `opening balance: ${d.openingBalance ? "present" : "none"}`,
    (d) => !/accountNumber|ifscCode|inviteCode|adminUid/.test(JSON.stringify(d)));
  await step("group roster", () => data.listGroupRoster(db, gid), (r) => `${r.length} members`);
  await step("group loans (opening + recorded)", () => data.listGroupLoans(db, gid), (r) =>
    `${r.loans.length} loans: ${r.loans.filter((l) => l.source === "opening").length} opening, ${r.loans.filter((l) => l.interestModel === "flat" && l.repaymentMode === "emi").length} flat EMI, ${r.loans.filter((l) => l.interestModel === "reducingBalance" && l.repaymentMode === "emi").length} reducing-balance EMI, ${r.loans.filter((l) => l.repaymentMode === "flexible").length} flexible`,
    (r) =>
      r.loans.filter((l) => l.source === "recorded").every((l) => (l.repaymentMode === "flexible") === (l.outstanding === null && !l.interestKnown)) &&
      r.loans.every((l) => l.repaymentMode === "flexible" || l.principalOutstanding !== null));
  await step("group meetings", () => data.listGroupMeetings(db, gid), (m) => `${m.length} meetings`);
  await step(`report ${new Date().getFullYear()}`, () => data.getReport(db, gid, new Date().getFullYear()), (r) =>
    `${r.months.length} months, ${r.months.filter((m) => m.closure).length} closed, ${r.ruleVersions.length} rule versions, truncated: ${r.truncated}`,
    (r) => r.months.length === 12 && !JSON.stringify(r).includes("updatedByUid"));
}
const members = await step("members (all groups)", () => data.listMembers(db, {}), (p) => `${p.items.length} on page 1, more: ${Boolean(p.next)}`);
const first = members?.items[0];
if (first) {
  await step("member detail", () => data.getMemberDetail(db, first.groupId, first.id), (d) =>
    `${d.loans.length} loans, ${d.history.items.length} history entries, savings ₹${d.account.savings.total}`,
    (d) => !/idNumber|address/.test(JSON.stringify(d.member)));
}
const tx = await step("transactions page 1 (all kinds, all groups)", () => data.listTransactions(db, {}), (p) =>
  `${p.items.length} rows, kinds: ${[...new Set(p.items.map((t) => t.kind))].join(", ") || "none"}, more: ${Boolean(p.next)}`,
  (p) => p.items.every((t, i) => i === 0 || (t.date?.getTime() ?? 0) <= (p.items[i - 1].date?.getTime() ?? 0)));
if (tx?.next) await step("transactions page 2", () => data.listTransactions(db, { cursor: tx.next }), (p) => `${p.items.length} rows`);
await step("loans (all groups)", () => data.listLoans(db, {}), (p) => `${p.items.length} on page 1`);
await step("meetings (all groups)", () => data.listMeetings(db, {}), (p) => `${p.items.length} on page 1 (an empty collection is a valid empty state)`);
await step("group search + names", async () => {
  const found = await data.searchGroups(db, "");
  return { found: found.length, names: Object.keys(await data.getGroupNames(db, found.map((g) => g.id))).length };
}, (r) => `${r.found} found, ${r.names} names resolved`, (r) => r.found === r.names);

console.log(`\n${passed} passed, ${failed} failed (read-only; no writes attempted)`);
await db.terminate();
process.exit(failed ? 1 : 0);
