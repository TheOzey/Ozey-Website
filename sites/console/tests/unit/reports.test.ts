import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReport, istDayStart, periodOf } from "../../src/modules/shg/domain/reports.ts";
import { compareRuleVersions, ruleVersionFor, type RuleVersionForOrdering } from "../../src/modules/shg/domain/rules.ts";
import type { ShgMeeting, ShgTransaction } from "../../src/modules/shg/types/index.ts";

const rv = (effectiveFrom: string, revision: number, monthlySavings: number, updated = "2026-01-01T00:00:00Z"): RuleVersionForOrdering => ({
  id: `${effectiveFrom}_r${revision}`, effectiveFrom, revision, monthlySavings, latePenalty: 20, meetingDay: 5, graceDays: 3, updatedAt: new Date(updated), updatedByUid: "u",
});
const tx = (kind: ShgTransaction["kind"], amount: number, date: string, period: string | null = null): ShgTransaction => ({
  key: `${kind}:${date}:${amount}`, id: "x", groupId: "g1", kind, memberId: "m1", memberName: null, amount, date: new Date(date), period,
  isReversal: amount < 0, notes: null, loanId: null, meetingId: null, openingKind: null, chargeKind: null, appliesToPeriod: null,
});

test("rule ordering: effectiveFrom → revision → updatedAt", () => {
  const sorted = [rv("2026-03", 0, 600), rv("2025-01", 1, 400), rv("2025-01", 0, 300)].sort(compareRuleVersions);
  assert.deepEqual(sorted.map((v) => v.id), ["2025-01_r0", "2025-01_r1", "2026-03_r0"]);
});
test("rule version for a period: last version with effectiveFrom ≤ period", () => {
  const sorted = [rv("2025-01", 0, 300), rv("2025-01", 1, 400), rv("2026-03", 0, 600)].sort(compareRuleVersions);
  assert.equal(ruleVersionFor(sorted, "2024-12"), null);
  assert.equal(ruleVersionFor(sorted, "2026-02")?.monthlySavings, 400);
  assert.equal(ruleVersionFor(sorted, "2026-03")?.monthlySavings, 600);
});
test("periods are IST calendar months (a 23:30 IST record stays in its month)", () => {
  assert.equal(periodOf(new Date("2026-08-31T18:00:00Z")), "2026-08"); // 23:30 IST, 31 Aug
  assert.equal(periodOf(new Date("2026-08-31T18:31:00Z")), "2026-09"); // 00:01 IST, 1 Sep
  assert.equal(istDayStart("2026-09-01")?.toISOString(), "2026-08-31T18:30:00.000Z");
});
test("report: sums by period, reversals included, closures and rules attached, not mixed", () => {
  const meeting: ShgMeeting = { id: "mt", groupId: "g1", date: new Date("2026-09-05T05:00:00Z"), period: "2026-09", attendeeCount: 5, totalMembers: 6, savingsCollected: 3000, loansDisbursed: 0, loansRepaid: 0, extraIncome: 100, moneySpent: 40, extraIncomeDesc: null, moneySpentDesc: null, attributedRecords: true };
  const r = buildReport({
    groupId: "g1",
    year: 2026,
    transactions: [
      tx("saving", 500, "2026-09-05T05:00:00Z", "2026-09"),
      tx("saving", -500, "2026-09-06T05:00:00Z", "2026-09"),
      tx("saving", 500, "2026-09-05T05:00:00Z", "2026-09"),
      tx("repayment", 333, "2026-09-09T05:00:00Z"),
      tx("disbursement", 15000, "2026-08-08T05:00:00Z"),
      tx("monthly-charge", 20, "2026-09-06T05:00:00Z", "2026-09"),
      tx("opening-repayment", 1500, "2026-05-09T05:00:00Z", "2026-05"),
      tx("saving", 999, "2025-12-05T05:00:00Z", "2025-12"), // other year: ignored
    ],
    meetings: [meeting],
    closures: [{ period: "2026-08", status: "closed", closingBalance: 41000, totalSavings: 3000, totalLoanRepayments: 0, totalInterest: 0, totalExpenses: 0, totalOtherIncome: 0, totalLateFines: 0, closedAt: null, reopenedAt: null }],
    ruleVersions: [rv("2025-01", 0, 500)],
    openingBalance: null,
  });
  assert.equal(r.months.length, 12);
  const sep = r.months.find((m) => m.period === "2026-09")!;
  assert.equal(sep.savings, 500);
  assert.equal(sep.loanRepayments, 333);
  assert.equal(sep.lateFeesCollected, 20);
  assert.equal(sep.otherIncome, 100);
  assert.equal(sep.expenses, 40);
  assert.equal(sep.meetings, 1);
  assert.equal(sep.closure, null);
  const aug = r.months.find((m) => m.period === "2026-08")!;
  assert.equal(aug.loansDisbursed, 15000);
  assert.equal(aug.closure?.closingBalance, 41000);
  assert.equal(aug.savings, 0, "closure snapshot figures are not mixed into computed sums");
  assert.equal(aug.rules?.monthlySavings, 500);
  assert.equal(r.totals.savings, 500);
  assert.equal(r.totals.openingRepayments, 1500);
});
test("report on an empty group is twelve zero months", () => {
  const r = buildReport({ groupId: "g1", year: 2026, transactions: [], meetings: [], closures: [], ruleVersions: [], openingBalance: null });
  assert.equal(r.months.length, 12);
  assert.ok(r.months.every((m) => m.savings === 0 && m.closure === null && m.rules === null));
  assert.equal(r.totals.loanRepayments, 0);
});
