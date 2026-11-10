import assert from "node:assert/strict";
import { test } from "node:test";
import {
  interestFor,
  interestModelFromIndex,
  loanFigures,
  loanTenureMonths,
  repaymentModeFromIndex,
} from "../../src/modules/shg/domain/loan-math.ts";

const d = (y: number, m: number, day = 8) => new Date(y, m - 1, day);

test("flat interest = principal × rate × months (LoanSchedule.interestFor)", () => {
  assert.equal(interestFor(20000, 2, 10, "flat"), 4000);
});
test("reducing-balance interest = principal × rate × (months + 1) / 2", () => {
  assert.equal(interestFor(12000, 2, 12, "reducingBalance"), 1560); // 240 × 13 / 2
  assert.equal(interestFor(10000, 1.5, 6, "reducingBalance"), 525); // 150 × 7 / 2
});
test("no interest for non-positive principal or months", () => {
  assert.equal(interestFor(0, 2, 10, "flat"), 0);
  assert.equal(interestFor(1000, 2, 0, "reducingBalance"), 0);
});
test("tenure in whole calendar months, clamped to [1, 120]", () => {
  assert.equal(loanTenureMonths(d(2025, 11), d(2026, 9)), 10);
  assert.equal(loanTenureMonths(d(2026, 3), d(2026, 3)), 1);
  assert.equal(loanTenureMonths(d(2000, 1), d(2030, 1)), 120);
});
test("index fallbacks mirror the app: absent/out-of-range → flat / emi", () => {
  assert.equal(interestModelFromIndex(0), "flat");
  assert.equal(interestModelFromIndex(1), "reducingBalance");
  assert.equal(interestModelFromIndex(7), "flat");
  assert.equal(interestModelFromIndex(undefined), "flat");
  assert.equal(repaymentModeFromIndex(1), "flexible");
  assert.equal(repaymentModeFromIndex(9), "emi");
  assert.equal(repaymentModeFromIndex(null), "emi");
});
test("EMI loan figures: total due and outstanding, never negative", () => {
  const f = loanFigures({ principal: 20000, interestMonthlyPct: 2, amountRepaid: 12000, disbursedAt: d(2025, 11), dueDate: d(2026, 9), interestModel: "flat", repaymentMode: "emi" });
  assert.deepEqual(f, { interestKnown: true, tenureMonths: 10, totalInterest: 4000, totalDue: 24000, outstanding: 12000 });
  const paid = loanFigures({ principal: 1000, interestMonthlyPct: 2, amountRepaid: 5000, disbursedAt: d(2026, 1), dueDate: d(2026, 3), interestModel: "flat", repaymentMode: "emi" });
  assert.equal(paid.outstanding, 0);
});
test("reducing-balance loan figures", () => {
  const f = loanFigures({ principal: 12000, interestMonthlyPct: 2, amountRepaid: 2000, disbursedAt: d(2026, 1), dueDate: d(2027, 1), interestModel: "reducingBalance", repaymentMode: "emi" });
  assert.equal(f.totalInterest, 1560);
  assert.equal(f.totalDue, 13560);
  assert.equal(f.outstanding, 11560);
});
test("FLEXIBLE loans: interest, total due and outstanding are unknown (never estimated)", () => {
  for (const model of ["flat", "reducingBalance"] as const) {
    const f = loanFigures({ principal: 8000, interestMonthlyPct: 1, amountRepaid: 1000, disbursedAt: d(2026, 1), dueDate: d(2026, 1), interestModel: model, repaymentMode: "flexible" });
    assert.deepEqual(f, { interestKnown: false, tenureMonths: null, totalInterest: null, totalDue: null, outstanding: null });
  }
});
