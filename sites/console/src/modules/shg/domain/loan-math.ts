/**
 * The SHG app's loan arithmetic, mirrored exactly from origin/main:
 *   lib/core/finance/loan_schedule.dart  (LoanSchedule.interestFor)
 *   lib/features/loans/models/loan.dart  (loanMonths, totalDue, outstanding,
 *                                         interestModel / repaymentMode fallbacks)
 * Do not "improve" these formulas here; the console must show the app's numbers.
 *
 * Flexible ("Without EMI") loans are deliberately NOT computed: the app charges
 * their interest month by month into LoanInterestChargeRepository, a
 * device-local Hive store that is never synced to Firestore. Cloud data cannot
 * determine that interest, so it is reported as unknown (null), never estimated.
 */
import type { LoanInterestModel, LoanRepaymentMode } from "../types/index.ts";

/** Out-of-range indexes (a newer build's record) fall back to flat, like the app. */
export function interestModelFromIndex(index: unknown): LoanInterestModel {
  return index === 1 ? "reducingBalance" : "flat";
}

/** Out-of-range indexes fall back to EMI, like the app. */
export function repaymentModeFromIndex(index: unknown): LoanRepaymentMode {
  return index === 1 ? "flexible" : "emi";
}

/** Whole months between disbursement and due date, clamped to [1, 120]. */
export function loanTenureMonths(disbursedAt: Date, dueDate: Date): number {
  const months =
    (dueDate.getFullYear() - disbursedAt.getFullYear()) * 12 + (dueDate.getMonth() - disbursedAt.getMonth());
  return Math.min(Math.max(months, 1), 120);
}

/** LoanSchedule.interestFor — exact, unrounded. */
export function interestFor(principal: number, monthlyRatePct: number, months: number, model: LoanInterestModel): number {
  if (principal <= 0 || months <= 0) return 0;
  const monthlyCharge = principal * (monthlyRatePct / 100);
  return model === "reducingBalance" ? (monthlyCharge * (months + 1)) / 2 : monthlyCharge * months;
}

export interface LoanFigures {
  interestKnown: boolean;
  tenureMonths: number | null;
  totalInterest: number | null;
  totalDue: number | null;
  outstanding: number | null;
}

export function loanFigures(input: {
  principal: number;
  interestMonthlyPct: number;
  amountRepaid: number;
  disbursedAt: Date | null;
  dueDate: Date | null;
  interestModel: LoanInterestModel;
  repaymentMode: LoanRepaymentMode;
}): LoanFigures {
  if (input.repaymentMode === "flexible") {
    return { interestKnown: false, tenureMonths: null, totalInterest: null, totalDue: null, outstanding: null };
  }
  // The app's timestamps always exist; a missing one means a malformed document.
  // Fall back to the minimum tenure, as the app's own clamp would.
  const tenureMonths = input.disbursedAt && input.dueDate ? loanTenureMonths(input.disbursedAt, input.dueDate) : 1;
  const totalInterest = interestFor(input.principal, input.interestMonthlyPct, tenureMonths, input.interestModel);
  const totalDue = input.principal + totalInterest;
  return {
    interestKnown: true,
    tenureMonths,
    totalInterest,
    totalDue,
    outstanding: Math.max(totalDue - input.amountRepaid, 0),
  };
}

// ── Principal outstanding (FinancialEngine.loanPrincipalOutstanding) ─────────

/** Dart's `roundToDouble()`: nearest whole number, ties away from zero. */
const roundDart = (x: number) => Math.sign(x) * Math.round(Math.abs(x));

export interface ScheduleRow {
  principalDue: number;
  interestDue: number;
}

/**
 * LoanSchedule.build — whole-rupee rows; the final month settles the remainder
 * of each column so the schedule reconciles exactly.
 */
export function buildSchedule(principal: number, monthlyRatePct: number, months: number, model: LoanInterestModel): ScheduleRow[] {
  if (principal <= 0 || months <= 0) return [];
  const wholePrincipal = roundDart(principal);
  const wholeInterest = roundDart(interestFor(principal, monthlyRatePct, months, model));
  const principalShare = roundDart(wholePrincipal / months);
  const monthlyCharge = principal * (monthlyRatePct / 100);
  let remainingPrincipal = wholePrincipal;
  let remainingInterest = wholeInterest;
  const rows: ScheduleRow[] = [];
  for (let month = 1; month <= months; month++) {
    const isFinal = month === months;
    const principalDue = isFinal ? remainingPrincipal : Math.min(principalShare, remainingPrincipal);
    // LoanSchedule.interestForMonth
    const monthInterest = roundDart(model === "reducingBalance" ? (monthlyCharge * (months - month + 1)) / months : monthlyCharge);
    const interestDue = isFinal ? remainingInterest : Math.min(monthInterest, remainingInterest);
    remainingPrincipal -= principalDue;
    remainingInterest -= interestDue;
    rows.push({ principalDue, interestDue });
  }
  return rows;
}

/** LoanSchedule.allocate — interest-first waterfall, row by row. */
export function allocate(rows: ScheduleRow[], amountPaid: number): { interestPaid: number; principalPaid: number } {
  let remaining = Math.max(0, amountPaid);
  let interestPaid = 0;
  let principalPaid = 0;
  for (const row of rows) {
    if (remaining <= 0) break;
    const toInterest = Math.min(row.interestDue, remaining);
    interestPaid += toInterest;
    remaining -= toInterest;
    if (remaining <= 0) break;
    const toPrincipal = Math.min(row.principalDue, remaining);
    principalPaid += toPrincipal;
    remaining -= toPrincipal;
  }
  return { interestPaid, principalPaid };
}

/**
 * Loan principal still owed — FinancialEngine.loanPrincipalOutstanding:
 *   principal − Σ (repayment − interestPortionOf(repayment)), clamped at 0.
 *
 * `paid` is the signed Σ of the loan's `repayments` records (reversals
 * included). The app's per-repayment interest portions telescope to one
 * calculation on the cumulative total:
 *   flat              interest share = paid × totalInterest / totalDue
 *   reducing balance  LoanSchedule.allocate(paid).principalPaid
 *   flexible          interest is charged on-device only (Hive), so once any
 *                     repayment exists the principal part cannot be derived →
 *                     null. With nothing repaid it is exactly the principal.
 */
export function loanPrincipalOutstanding(input: {
  principal: number;
  interestMonthlyPct: number;
  disbursedAt: Date | null;
  dueDate: Date | null;
  interestModel: LoanInterestModel;
  repaymentMode: LoanRepaymentMode;
  /** Signed Σ of this loan's repayment records. */
  paid: number;
}): number | null {
  if (input.repaymentMode === "flexible") return input.paid === 0 ? Math.max(input.principal, 0) : null;
  const months = input.disbursedAt && input.dueDate ? loanTenureMonths(input.disbursedAt, input.dueDate) : 1;
  const totalInterest = interestFor(input.principal, input.interestMonthlyPct, months, input.interestModel);
  const totalDue = input.principal + totalInterest;
  let principalRepaid: number;
  if (totalDue <= 0) principalRepaid = input.paid; // interestPortionOf → 0
  else if (input.interestModel === "flat") principalRepaid = input.paid - input.paid * (totalInterest / totalDue);
  else principalRepaid = allocate(buildSchedule(input.principal, input.interestMonthlyPct, months, input.interestModel), input.paid).principalPaid;
  return Math.max(input.principal - principalRepaid, 0);
}
