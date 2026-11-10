// Regression tests for the console's SHG financial definitions. Each expected
// value is worked by hand from the SHG app's formulas on origin/main
// (FinancialEngine, OpeningOutstanding, MemberAccountSummary, LoanSchedule).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_MEMBER_MAPS,
  groupFinancials,
  istPeriod,
  memberAccount,
  openingLoanOwed,
  openingLoanRows,
  paidByLoan,
  sumFinancials,
  withPrincipalOutstanding,
} from "../../src/modules/shg/domain/financials.ts";
import { allocate, buildSchedule, loanPrincipalOutstanding } from "../../src/modules/shg/domain/loan-math.ts";
import type { ShgLoan, ShgOpeningBalance, ShgOpeningMemberMaps } from "../../src/modules/shg/types/index.ts";

const NOW = new Date("2026-10-03T06:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
const close = (a: number | null, b: number) => assert.ok(a !== null && Math.abs(a - b) < 1e-6, `${a} ≈ ${b}`);

const loan = (over: Partial<ShgLoan>): ShgLoan => ({
  id: "l", source: "recorded", groupId: "g", memberId: "m1", memberName: "M", principal: 10000, interestMonthlyPct: 2, amountRepaid: 0,
  disbursedAt: new Date("2026-03-08T05:00:00Z"), dueDate: new Date("2026-09-08T05:00:00Z"), status: "active", purpose: null, meetingId: null,
  interestModel: "flat", repaymentMode: "emi", interestKnown: true, tenureMonths: 6, totalInterest: 1200, totalDue: 11200, outstanding: 11200,
  principalOutstanding: null, outstandingAtOpening: null, ...over,
});

const opening = (over: Partial<ShgOpeningBalance> = {}): ShgOpeningBalance => ({
  totalSavings: 528000, outstandingLoans: 304000, totalLoansGiven: 460000, totalInterestCollected: 38800, totalLateFeesCollected: 0,
  otherIncome: 3091, otherExpense: 165.2, asOf: new Date("2026-09-15T16:18:23Z"), updatedAt: null, ...over,
});
const maps = (over: Partial<ShgOpeningMemberMaps>): ShgOpeningMemberMaps => ({ ...EMPTY_MEMBER_MAPS, ...over });

// ── Loan schedule and principal outstanding ─────────────────────────────────

test("reducing-balance schedule: whole-rupee rows that reconcile to the totals (LoanSchedule.build)", () => {
  const rows = buildSchedule(12000, 2, 12, "reducingBalance");
  assert.equal(rows.length, 12);
  assert.deepEqual(rows.slice(0, 3).map((r) => [r.principalDue, r.interestDue]), [[1000, 240], [1000, 220], [1000, 200]]);
  assert.equal(rows.reduce((s, r) => s + r.principalDue, 0), 12000);
  assert.equal(rows.reduce((s, r) => s + r.interestDue, 0), 1560);
});

test("allocate is interest-first, row by row (LoanSchedule.allocate)", () => {
  const rows = buildSchedule(12000, 2, 12, "reducingBalance");
  assert.deepEqual(allocate(rows, 1000), { interestPaid: 240, principalPaid: 760 });
  assert.deepEqual(allocate(rows, 1500), { interestPaid: 460, principalPaid: 1040 });
  assert.deepEqual(allocate(rows, -50), { interestPaid: 0, principalPaid: 0 });
});

test("principal outstanding: flat splits each repayment by principal/totalDue", () => {
  const base = { principal: 10000, interestMonthlyPct: 2, disbursedAt: new Date("2026-03-08T05:00:00Z"), dueDate: new Date("2026-09-08T05:00:00Z"), interestModel: "flat" as const, repaymentMode: "emi" as const };
  close(loanPrincipalOutstanding({ ...base, paid: 0 }), 10000);
  close(loanPrincipalOutstanding({ ...base, paid: 2000 }), 10000 - (2000 * 10000) / 11200);
  close(loanPrincipalOutstanding({ ...base, paid: 11200 }), 0);
  close(loanPrincipalOutstanding({ ...base, paid: 20000 }), 0); // clamped
});

test("principal outstanding: reducing balance uses the schedule waterfall", () => {
  const base = { principal: 12000, interestMonthlyPct: 2, disbursedAt: new Date("2026-01-08T05:00:00Z"), dueDate: new Date("2027-01-08T05:00:00Z"), interestModel: "reducingBalance" as const, repaymentMode: "emi" as const };
  close(loanPrincipalOutstanding({ ...base, paid: 0 }), 12000);
  close(loanPrincipalOutstanding({ ...base, paid: 1500 }), 10960);
});

test("FLEXIBLE: principal outstanding is the principal while nothing is repaid, unknown (null) after", () => {
  const base = { principal: 8000, interestMonthlyPct: 1, disbursedAt: null, dueDate: null, interestModel: "flat" as const, repaymentMode: "flexible" as const };
  assert.equal(loanPrincipalOutstanding({ ...base, paid: 0 }), 8000);
  assert.equal(loanPrincipalOutstanding({ ...base, paid: 500 }), null);
});

test("paidByLoan sums each loan's repayments with reversals (signed)", () => {
  const paid = paidByLoan([{ loanId: "a", amount: 1000 }, { loanId: "a", amount: 1000 }, { loanId: "a", amount: -1000 }, { loanId: "b", amount: 50 }]);
  assert.deepEqual([...paid], [["a", 1000], ["b", 50]]);
});

// ── Opening balance ─────────────────────────────────────────────────────────

test("opening loan owed: original − loan-kind collections, clamped; legacy balance when no original (OpeningOutstanding)", () => {
  const m = maps({ loanBalanceOriginal: { a: 50000 }, loanBalance: { a: 99999, b: 30000 } });
  const rows = [
    { memberId: "a", kind: "loan", amount: 20000 },
    { memberId: "a", kind: "interest", amount: 900 }, // interest never reduces principal
    { memberId: "a", kind: "lateFee", amount: 100 },
    { memberId: "b", kind: "loan", amount: 5000 }, // b has no original: legacy map is already decremented
  ];
  assert.equal(openingLoanOwed("a", m, rows), 30000);
  assert.equal(openingLoanOwed("b", m, rows), 30000);
  assert.equal(openingLoanOwed("a", m, [...rows, { memberId: "a", kind: "loan", amount: 40000 }]), 0);
  assert.equal(openingLoanOwed("nobody", m, rows), 0);
});

test("opening loan rows: one per member with a pre-app loan, keyed by member id, never merged with recorded loans", () => {
  const rows = openingLoanRows({
    groupId: "g",
    maps: maps({ loanTaken: { a: 100000, b: 0, c: 60000 }, loanBalanceOriginal: { a: 100000, c: 24000 } }),
    openingRepayments: [{ memberId: "c", kind: "loan", amount: 4000 }],
    memberNames: { a: "A", c: "C" },
    asOf: new Date("2026-09-15T00:00:00Z"),
  });
  assert.deepEqual(
    rows.map((l) => [l.id, l.source, l.principal, l.outstandingAtOpening, l.amountRepaid, l.principalOutstanding, l.status]),
    [["opening:a", "opening", 100000, 100000, 0, 100000, "active"], ["opening:c", "opening", 60000, 24000, 4000, 20000, "active"]],
  );
  assert.ok(rows.every((l) => l.interestModel === null && l.totalInterest === null));
});

// ── Group financials ────────────────────────────────────────────────────────

test("group savings = opening savings + recorded savings up to the current month (not ₹0 when only opening exists)", () => {
  const f = groupFinancials({
    now: NOW,
    members: [],
    savings: { upToCurrentPeriod: 0, afterCurrentPeriod: 0, last30Days: 0 },
    loans: [],
    opening: opening(),
    openingRepayments: [],
  });
  assert.deepEqual([f.savings.opening, f.savings.recorded, f.savings.total], [528000, 0, 528000]);
  const g = groupFinancials({
    now: NOW,
    members: [],
    savings: { upToCurrentPeriod: 7000, afterCurrentPeriod: 500, last30Days: 1500 },
    loans: [],
    opening: opening(),
    openingRepayments: [],
  });
  assert.deepEqual([g.savings.total, g.savings.advance, g.savings.recordedLast30Days], [535000, 500, 1500]); // advance not counted yet
});

test("group loans: opening given + recorded principal; outstanding principal from both; flexible-with-repayments excluded explicitly", () => {
  const recorded = withPrincipalOutstanding(
    [
      loan({ id: "flat" }),
      loan({ id: "repaid", status: "repaid", principal: 5000 }),
      loan({ id: "flex", principal: 8000, repaymentMode: "flexible", interestKnown: false }),
    ],
    paidByLoan([{ loanId: "repaid", amount: 99999 }, { loanId: "flex", amount: 500 }]),
  );
  const f = groupFinancials({
    now: NOW,
    members: [],
    savings: { upToCurrentPeriod: 0, afterCurrentPeriod: 0, last30Days: 0 },
    loans: recorded,
    opening: opening(),
    openingRepayments: [{ memberId: "x", kind: "loan", amount: 4000 }, { memberId: "x", kind: "interest", amount: 700 }],
  });
  assert.equal(f.loans.recordedPrincipal, 23000);
  assert.equal(f.loans.totalRecorded, 23000 + 460000);
  assert.equal(f.loans.recordedOutstanding, 10000); // flat untouched; repaid → 0; flex unknown → excluded
  assert.equal(f.loans.openingOutstanding, 300000); // 304000 − 4000 (interest does not count)
  assert.equal(f.loans.outstandingPrincipal, 310000);
  assert.deepEqual([f.loans.openLoans, f.loans.unknownFlexibleLoans, f.loans.unknownFlexiblePrincipal], [2, 1, 8000]);
});

test("members: only active (statusIndex 0) count; 'last 30 days' uses joinedAt", () => {
  const f = groupFinancials({
    now: NOW,
    members: [
      { status: "active", joinedAt: daysAgo(5) },
      { status: "active", joinedAt: daysAgo(29) },
      { status: "active", joinedAt: daysAgo(31) },
      { status: "active", joinedAt: null },
      { status: "left", joinedAt: daysAgo(2) },
    ],
    savings: { upToCurrentPeriod: 0, afterCurrentPeriod: 0, last30Days: 0 },
    loans: [],
    opening: null,
    openingRepayments: [],
  });
  assert.deepEqual(f.members, { active: 4, activeAddedLast30Days: 2 });
});

test("empty group: every figure is zero, nothing is invented", () => {
  const f = groupFinancials({ now: NOW, members: [], savings: { upToCurrentPeriod: 0, afterCurrentPeriod: 0, last30Days: 0 }, loans: [], opening: null, openingRepayments: [] });
  assert.ok([...Object.values(f.members), ...Object.values(f.savings), ...Object.values(f.loans)].every((v) => v === 0));
});

test("overview aggregates ALL groups (Σ of every field)", () => {
  const a = groupFinancials({ now: NOW, members: [{ status: "active", joinedAt: daysAgo(1) }], savings: { upToCurrentPeriod: 100, afterCurrentPeriod: 0, last30Days: 100 }, loans: [], opening: opening(), openingRepayments: [] });
  const b = groupFinancials({ now: NOW, members: [{ status: "active", joinedAt: daysAgo(90) }], savings: { upToCurrentPeriod: 50, afterCurrentPeriod: 0, last30Days: 0 }, loans: withPrincipalOutstanding([loan({})], new Map()), opening: null, openingRepayments: [] });
  const s = sumFinancials([a, b]);
  assert.deepEqual(s.members, { active: 2, activeAddedLast30Days: 1 });
  assert.equal(s.savings.total, 528000 + 150);
  assert.equal(s.loans.totalRecorded, 460000 + 10000);
  assert.equal(s.loans.outstandingPrincipal, 304000 + 10000);
  assert.deepEqual(sumFinancials([]).savings.total, 0);
});

test("IST accounting period: 23:30 IST on 30 Sep is September; 00:30 IST on 1 Oct is October", () => {
  assert.equal(istPeriod(new Date("2026-09-30T18:00:00Z")), "2026-09");
  assert.equal(istPeriod(new Date("2026-09-30T19:00:00Z")), "2026-10");
});

// ── Member account (MemberAccountSummary) ───────────────────────────────────

test("member: savings = opening allocation + members.totalSavings; loans and interest include opening; keyed by member id only", () => {
  const m = maps({
    savings: { m1: 44000, m2: 44000 },
    loanTaken: { m1: 125000 },
    loanBalanceOriginal: { m1: 100000 },
    interestPaid: { m1: 4200 },
    lateFeesPaid: { m1: 50 },
    lateFeesDueOriginal: { m1: 200 },
  });
  const loans = withPrincipalOutstanding([loan({ id: "x", memberId: "m1", principal: 25000 })], new Map());
  const a = memberAccount({
    memberId: "m1",
    cachedTotalSavings: 1500,
    savingsEntries: [{ amount: 1000 }, { amount: 1000 }, { amount: -500 }],
    loans,
    maps: m,
    openingRepayments: [
      { memberId: "m1", kind: "loan", amount: 10000 },
      { memberId: "m1", kind: "interest", amount: 800 },
      { memberId: "m1", kind: "lateFee", amount: 50 },
      { memberId: "uid-of-m1", kind: "loan", amount: 77777 }, // a record keyed by the wrong id must not count
      { memberId: "m2", kind: "loan", amount: 5000 },
    ],
    monthlyCharges: [{ kind: "lateFee", amount: 20 }],
    meetings: { attended: 3, recorded: 4 },
    openingAsOf: null,
  });
  assert.deepEqual(a.savings, { opening: 44000, recorded: 1500, recordedFromEntries: 1500, entries: 3, total: 45500 });
  assert.equal(a.loans.openingTaken, 125000);
  assert.equal(a.loans.openingOutstandingAtStart, 100000);
  assert.equal(a.loans.openingCollected, 10000);
  assert.equal(a.loans.openingOutstanding, 90000);
  assert.equal(a.loans.totalTaken, 150000);
  assert.equal(a.loans.outstandingPrincipal, 90000 + 25000);
  assert.deepEqual(a.interest, { openingPaidBeforeApp: 4200, openingCollected: 800, total: 5000 });
  assert.deepEqual(a.fines, { openingDue: 150, openingPaid: 100, monthlyLateFinesPaid: 20 });
  assert.equal(a.hasOpening, true);
});

test("member with no records and no opening allocation: zeros and hasOpening false", () => {
  const a = memberAccount({
    memberId: "m9", cachedTotalSavings: 0, savingsEntries: [], loans: [], maps: EMPTY_MEMBER_MAPS, openingRepayments: [], monthlyCharges: [],
    meetings: { attended: 0, recorded: 0 }, openingAsOf: null,
  });
  assert.equal(a.savings.total, 0);
  assert.equal(a.loans.outstandingPrincipal, 0);
  assert.equal(a.hasOpening, false);
});
