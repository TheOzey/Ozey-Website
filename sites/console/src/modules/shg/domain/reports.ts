/**
 * Read-only report aggregation over a group's existing records for one year.
 * No second reporting datastore: every figure is summed from the documents the
 * app already writes, and the app's own monthly closure snapshot is attached
 * alongside (never mixed into) the computed cash figures.
 */
import type {
  ShgMeeting,
  ShgMonthlyClosure,
  ShgReport,
  ShgReportMonth,
  ShgRuleVersion,
  ShgOpeningBalance,
  ShgTransaction,
} from "../types/index.ts";
import { ruleVersionFor } from "./rules.ts";

/**
 * SHG records are created on devices in India and bucketed by the device's
 * local calendar month (FinancialEngine uses `date.month`). The console
 * reproduces that in Asia/Kolkata regardless of the server's own time zone.
 */
export const SHG_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function periodOf(date: Date | null): string | null {
  if (!date) return null;
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Start of a calendar day in IST, as an absolute instant. `day` is YYYY-MM-DD. */
export function istDayStart(day: string): Date | null {
  const m = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - IST_OFFSET_MS);
}

/** [start, end) of a calendar year in IST. */
export function istYearRange(year: number): [Date, Date] {
  return [new Date(Date.UTC(year, 0, 1) - IST_OFFSET_MS), new Date(Date.UTC(year + 1, 0, 1) - IST_OFFSET_MS)];
}

export function periodsOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

type Sums = Omit<ShgReportMonth, "period" | "closure" | "rules">;
const zero = (): Sums => ({
  savings: 0,
  loanRepayments: 0,
  openingRepayments: 0,
  lateFeesCollected: 0,
  loansDisbursed: 0,
  otherIncome: 0,
  expenses: 0,
  meetings: 0,
});

/**
 * Which period a record counts toward: the record's own `period` (savings,
 * opening repayments and monthly charges carry the cash period), otherwise
 * the calendar month of its date (repayments, disbursements).
 */
function recordPeriod(tx: ShgTransaction): string | null {
  return tx.period ?? periodOf(tx.date);
}

export function buildReport(input: {
  groupId: string;
  year: number;
  transactions: readonly ShgTransaction[];
  meetings: readonly ShgMeeting[];
  closures: readonly ShgMonthlyClosure[];
  ruleVersions: readonly ShgRuleVersion[];
  openingBalance: ShgOpeningBalance | null;
}): ShgReport {
  const periods = periodsOfYear(input.year);
  const byPeriod = new Map(periods.map((p) => [p, zero()]));

  for (const tx of input.transactions) {
    const sums = byPeriod.get(recordPeriod(tx) ?? "");
    if (!sums) continue;
    // Reversals are negative amounts and are summed as-is, like the app.
    if (tx.kind === "saving") sums.savings += tx.amount;
    else if (tx.kind === "repayment") sums.loanRepayments += tx.amount;
    else if (tx.kind === "opening-repayment") sums.openingRepayments += tx.amount;
    else if (tx.kind === "monthly-charge") sums.lateFeesCollected += tx.amount;
    else if (tx.kind === "disbursement") sums.loansDisbursed += tx.amount;
  }
  for (const meeting of input.meetings) {
    const sums = byPeriod.get(meeting.period ?? periodOf(meeting.date) ?? "");
    if (!sums) continue;
    sums.otherIncome += meeting.extraIncome;
    sums.expenses += meeting.moneySpent;
    sums.meetings += 1;
  }

  const closures = new Map(input.closures.map((c) => [c.period, c]));
  const months: ShgReportMonth[] = periods.map((period) => ({
    period,
    ...byPeriod.get(period)!,
    closure: closures.get(period) ?? null,
    rules: ruleVersionFor(input.ruleVersions, period),
  }));

  const totals = zero();
  for (const m of months) {
    for (const key of Object.keys(totals) as (keyof Sums)[]) totals[key] += m[key];
  }

  return {
    groupId: input.groupId,
    year: input.year,
    months,
    totals,
    ruleVersions: [...input.ruleVersions],
    openingBalance: input.openingBalance,
  };
}
