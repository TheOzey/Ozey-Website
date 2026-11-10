#!/usr/bin/env node
// READ-ONLY reconciliation of the console's SHG figures against raw Firestore.
//
//   node scripts/shg-reconcile.ts
//
// For every group, and every member of every group, reads the raw documents
// independently (plain collection reads, no console code) and compares them
// with what the console's data layer (src/lib/server/shg/core/data.ts)
// returns. Runs as workforce-shg-reader (impersonated with your gcloud login,
// ≤ 15-minute token, datastore get/list only). Prints amounts, counts and
// hashed ids — never names, phone numbers or other personal data.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { Firestore, type QueryDocumentSnapshot } from "@google-cloud/firestore";
import { OAuth2Client } from "google-auth-library";
import * as data from "../src/lib/server/shg/core/data.ts";
import { createReaderTokenProvider } from "../src/lib/server/shg/core/reader-credentials.ts";
import { istPeriod } from "../src/modules/shg/domain/financials.ts";

const tokens = createReaderTokenProvider({
  serviceAccount: "workforce-shg-reader@ozey-shg.iam.gserviceaccount.com",
  lifetimeSeconds: 900,
  quotaProject: "project-5dedabbe-2c9d-433a-a40",
  callerToken: async () => execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim(),
});
const authClient = new OAuth2Client();
authClient.refreshHandler = async () => {
  const t = await tokens.getToken();
  return { access_token: t.token, expiry_date: t.expiresAt };
};
const db = new Firestore({ projectId: "ozey-shg", authClient });

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 8);
const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const total = (docs: QueryDocumentSnapshot[], field = "amount") => docs.reduce((s, d) => s + (Number(d.get(field)) || 0), 0);
const near = (a: number, b: number) => Math.abs(a - b) < 0.005;

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail: string) {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"} ${label} — ${detail}`);
}

const now = new Date();
const period = istPeriod(now);
const COLLECTIONS = ["members", "savings", "loans", "repayments", "meetings", "monthlyCharges", "openingRepayments", "monthlyClosures", "ruleVersions"];

const groupsRaw = await db.collection("groups").get();
const overview = await data.getOverview(db, now);
console.log(`ozey-shg, as of ${now.toISOString()} (IST period ${period})\n`);
check("overview: group count = groups documents", overview.groups === groupsRaw.size, `${overview.groups} vs ${groupsRaw.size}`);

let rawActive = 0;
let rawSavingsTotal = 0;
let rawLoansTotal = 0;
for (const g of groupsRaw.docs) {
  const gid = g.id;
  console.log(`\nGroup ${hash(gid)} ("${g.get("groupName")}")`);
  const raw: Record<string, QueryDocumentSnapshot[]> = {};
  for (const c of COLLECTIONS) raw[c] = (await g.ref.collection(c).get()).docs;
  const present = (await g.ref.listCollections()).map((c) => c.id).sort();
  console.log(`  collections with documents: ${present.join(", ")}`);
  console.log(`  raw counts: ${COLLECTIONS.map((c) => `${c} ${raw[c].length}`).join(", ")}`);
  const openingSnap = await g.ref.collection("openingBalance").doc("current").get();
  const o = openingSnap.data() ?? {};
  const map = (k: string) => (o[k] ?? {}) as Record<string, number>;
  const sumMap = (k: string) => Object.values(map(k)).reduce((a, b) => a + Number(b), 0);

  const f = await data.getGroupFinancials(db, gid, now);
  const active = raw.members.filter((d) => d.get("statusIndex") === 0).length;
  rawActive += active;
  check("active members (statusIndex 0)", f.members.active === active, `${f.members.active} vs raw ${active}`);

  // Savings: opening + recorded (period ≤ current month).
  const recUpTo = total(raw.savings.filter((d) => String(d.get("period")) <= period));
  const savingsExpected = Number(o.totalSavings ?? 0) + recUpTo;
  rawSavingsTotal += savingsExpected;
  check(
    "group savings = opening.totalSavings + Σ savings(period ≤ now)",
    near(f.savings.total, savingsExpected),
    `${rupees(f.savings.total)} = ${rupees(f.savings.opening)} opening + ${rupees(f.savings.recorded)} recorded; raw ${rupees(Number(o.totalSavings ?? 0))} + ${rupees(recUpTo)}`,
  );
  check(
    "opening savings: group total = Σ per-member allocations",
    near(Number(o.totalSavings ?? 0), sumMap("memberSavings")),
    `${rupees(Number(o.totalSavings ?? 0))} vs Σ memberSavings ${rupees(sumMap("memberSavings"))}`,
  );

  // Loans: recorded principal + opening totalLoansGiven.
  const loansExpected = total(raw.loans, "principal") + Number(o.totalLoansGiven ?? 0);
  rawLoansTotal += loansExpected;
  check(
    "total loans recorded = Σ loans.principal + opening.totalLoansGiven",
    near(f.loans.totalRecorded, loansExpected),
    `${rupees(f.loans.totalRecorded)} = ${rupees(f.loans.recordedPrincipal)} in-app (${f.loans.recordedCount} loans) + ${rupees(f.loans.openingGiven)} opening`,
  );
  check(
    "opening loans given: group total = Σ memberLoanTaken",
    near(Number(o.totalLoansGiven ?? 0), sumMap("memberLoanTaken")),
    `${rupees(Number(o.totalLoansGiven ?? 0))} vs ${rupees(sumMap("memberLoanTaken"))}`,
  );
  const openingLoanCollected = total(raw.openingRepayments.filter((d) => (d.get("kind") ?? "loan") === "loan"));
  check(
    "opening outstanding = max(0, opening.outstandingLoans − Σ openingRepayments[loan])",
    near(f.loans.openingOutstanding, Math.max(Number(o.outstandingLoans ?? 0) - openingLoanCollected, 0)),
    `${rupees(f.loans.openingOutstanding)} (snapshot ${rupees(Number(o.outstandingLoans ?? 0))}, collected ${rupees(openingLoanCollected)})`,
  );
  console.log(
    `  outstanding principal ${rupees(f.loans.outstandingPrincipal)} = ${rupees(f.loans.recordedOutstanding)} in-app + ${rupees(f.loans.openingOutstanding)} opening; flexible loans not derivable: ${f.loans.unknownFlexibleLoans}`,
  );

  // Loans list: every loans document + one row per member with an opening loan, no duplicates.
  const loans = await data.listGroupLoans(db, gid);
  const openingMembers = new Set(
    [...Object.entries(map("memberLoanTaken")), ...Object.entries(map("memberLoanBalanceOriginal")), ...Object.entries(map("memberLoanBalance"))]
      .filter(([, v]) => Number(v) > 0)
      .map(([k]) => k),
  );
  check(
    "loans list = every loans document + one opening row per member with a pre-app loan",
    loans.loans.filter((l) => l.source === "recorded").length === raw.loans.length &&
      loans.loans.filter((l) => l.source === "opening").length === openingMembers.size &&
      new Set(loans.loans.map((l) => l.id)).size === loans.loans.length,
    `${raw.loans.length} recorded + ${openingMembers.size} opening rows, ids unique`,
  );

  // Transactions: page through everything; must equal every payment record exactly once.
  const paymentRaw = raw.savings.length + raw.repayments.length + raw.openingRepayments.length + raw.monthlyCharges.length;
  const seen = new Set<string>();
  let cursor: string | null = null;
  const kinds = new Set<string>();
  do {
    const page: Awaited<ReturnType<typeof data.listTransactions>> = await data.listTransactions(db, { groupId: gid, cursor });
    for (const t of page.items) {
      seen.add(t.key);
      kinds.add(t.kind);
    }
    cursor = page.next;
  } while (cursor);
  check(
    "transactions = every savings, repayments, openingRepayments and monthlyCharges record, once; no disbursements",
    seen.size === paymentRaw && !kinds.has("disbursement"),
    `${seen.size} listed vs ${paymentRaw} raw payment records`,
  );

  // Every member: opening allocations + every record keyed by the member's document id.
  for (const m of raw.members) {
    const mid = m.id;
    const detail = await data.getMemberDetail(db, gid, mid);
    const a = detail.account;
    const mine = (c: string) => raw[c].filter((d) => d.get("memberId") === mid);
    const uid = String(m.get("uid") ?? "");
    const byUid = uid ? COLLECTIONS.slice(1).reduce((n, c) => n + raw[c].filter((d) => d.get("memberId") === uid).length, 0) : 0;
    const expectedSavings = Number(map("memberSavings")[mid] ?? 0) + Number(m.get("totalSavings") ?? 0);
    const recordCount = ["savings", "repayments", "openingRepayments", "monthlyCharges", "loans"].reduce((n, c) => n + mine(c).length, 0);
    const openingEntries = ["memberSavings", "memberLoanTaken", "memberInterestPaid", "memberLateFeesPaid"].filter((k) => Number(map(k)[mid] ?? 0) !== 0).length +
      (Number((map("memberLoanBalanceOriginal")[mid] ?? map("memberLoanBalance")[mid]) ?? 0) !== 0 ? 1 : 0) +
      (Number((map("memberLateFeesDueOriginal")[mid] ?? map("memberLateFeesDue")[mid]) ?? 0) !== 0 ? 1 : 0);
    const ok =
      near(a.savings.total, expectedSavings) &&
      near(a.savings.opening, Number(map("memberSavings")[mid] ?? 0)) &&
      near(a.loans.openingTaken, Number(map("memberLoanTaken")[mid] ?? 0)) &&
      near(a.interest.openingPaidBeforeApp, Number(map("memberInterestPaid")[mid] ?? 0)) &&
      detail.history.items.length === recordCount + openingEntries &&
      byUid === 0;
    check(
      `member ${hash(mid)}`,
      ok,
      `savings ${rupees(a.savings.total)} (opening ${rupees(a.savings.opening)} + recorded ${rupees(a.savings.recorded)}), loans taken ${rupees(a.loans.totalTaken)}, outstanding ${rupees(a.loans.outstandingPrincipal)}, interest paid ${rupees(a.interest.total)}; history ${detail.history.items.length} = ${recordCount} records + ${openingEntries} opening entries; records keyed by uid instead of member id: ${byUid}`,
    );
  }
}

check("overview: active members = Σ groups", overview.members.active === rawActive, `${overview.members.active} vs ${rawActive}`);
check("overview: savings = Σ groups", near(overview.savings.total, rawSavingsTotal), `${rupees(overview.savings.total)} vs ${rupees(rawSavingsTotal)}`);
check("overview: total loans recorded = Σ groups", near(overview.loans.totalRecorded, rawLoansTotal), `${rupees(overview.loans.totalRecorded)} vs ${rupees(rawLoansTotal)}`);
check(
  "overview: top groups ranked by savings, at most 10",
  overview.topGroupsBySavings.length === Math.min(10, groupsRaw.size) &&
    overview.topGroupsBySavings.every((g, i, all) => i === 0 || all[i - 1].savings >= g.savings),
  overview.topGroupsBySavings.map((g) => `${hash(g.id)} ${rupees(g.savings)}`).join(", "),
);

console.log(`\n${passed} passed, ${failed} failed (read-only; no writes attempted)`);
await db.terminate();
process.exit(failed ? 1 : 0);
