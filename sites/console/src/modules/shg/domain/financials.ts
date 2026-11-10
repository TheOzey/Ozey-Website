/**
 * The SHG app's financial definitions, mirrored from origin/main. Pure
 * functions over already-read records, so every definition is unit-tested.
 *
 * Sources (origin/main, lib/):
 *   core/services/financial_engine.dart
 *     groupTotalSavingsUpTo, groupTotalDisbursed, groupHistoricalLoanOutstanding,
 *     groupTotalPrincipalOutstanding, loanPrincipalOutstanding
 *   features/payments/opening_position.dart, opening_outstanding.dart,
 *   opening_repayment_draft.dart
 *     per-member opening figures and how in-app collections reduce them
 *   core/finance/member_account.dart
 *     MemberAccountSummary (a member's all-time position)
 *
 * Opening (pre-app) and recorded (in-app) money are disjoint by construction:
 * the Existing Group Savings wizard never creates `savings` or `loans`
 * documents, so adding the two never double-counts (FinancialEngine's own
 * documented rule for groupTotalDisbursed / groupTotalOutstanding).
 */
import type {
  GroupFinancials,
  ShgLoan,
  ShgMemberAccount,
  ShgOpeningBalance,
  ShgOpeningMemberMaps,
} from "../types/index.ts";
import { loanPrincipalOutstanding } from "./loan-math.ts";

export const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** The SHG accounting period ("YYYY-MM") of an instant, in IST (the app's locale). */
export function istPeriod(at: Date): string {
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface OpeningRepaymentRecord {
  memberId: string;
  /** "loan" | "lateFee" | "interest" (OpeningRepaymentKind). */
  kind: string;
  /** Signed; reversals carry the negated amount. */
  amount: number;
}

export interface RepaymentRecord {
  loanId: string;
  amount: number;
}

const sum = (values: Iterable<number>) => {
  let total = 0;
  for (const v of values) total += v;
  return total;
};

/** OpeningRepaymentDraft.signedTotalFor (memberId null → whole group). */
export function openingCollected(rows: readonly OpeningRepaymentRecord[], kind: string, memberId: string | null = null): number {
  return sum(rows.filter((r) => r.kind === kind && (memberId === null || r.memberId === memberId)).map((r) => r.amount));
}

export const EMPTY_MEMBER_MAPS: ShgOpeningMemberMaps = {
  savings: {},
  loanTaken: {},
  loanBalance: {},
  loanBalanceOriginal: {},
  lateFeesDue: {},
  lateFeesDueOriginal: {},
  lateFeesPaid: {},
  interestPaid: {},
};

/**
 * OpeningOutstanding.loanFor / lateFeeFor: with an immutable original,
 * max(0, original − collected); without one, the legacy (already-decremented)
 * balance unchanged. Decided per member and per field, never globally.
 */
function openingOwed(original: number | undefined, legacy: number | undefined, collected: number): number {
  if (original === undefined) return legacy ?? 0;
  return Math.max(original - collected, 0);
}

export function openingLoanOwed(memberId: string, maps: ShgOpeningMemberMaps, rows: readonly OpeningRepaymentRecord[]): number {
  return openingOwed(maps.loanBalanceOriginal[memberId], maps.loanBalance[memberId], openingCollected(rows, "loan", memberId));
}

export function openingLateFeeOwed(memberId: string, maps: ShgOpeningMemberMaps, rows: readonly OpeningRepaymentRecord[]): number {
  return openingOwed(maps.lateFeesDueOriginal[memberId], maps.lateFeesDue[memberId], openingCollected(rows, "lateFee", memberId));
}

/**
 * A member's opening loan balance when the group started using the app: the
 * immutable original, else the legacy balance plus what has been collected
 * against it since (undoing the legacy map's decrements).
 */
export function openingLoanAtStart(memberId: string, maps: ShgOpeningMemberMaps, rows: readonly OpeningRepaymentRecord[]): number {
  const original = maps.loanBalanceOriginal[memberId];
  if (original !== undefined) return original;
  const legacy = maps.loanBalance[memberId];
  return legacy === undefined ? 0 : legacy + openingCollected(rows, "loan", memberId);
}

/** Signed Σ of each loan's `repayments` records. */
export function paidByLoan(repayments: readonly RepaymentRecord[]): Map<string, number> {
  const paid = new Map<string, number>();
  for (const r of repayments) paid.set(r.loanId, (paid.get(r.loanId) ?? 0) + r.amount);
  return paid;
}

/** Recorded loans with `principalOutstanding` filled from their repayment records. */
export function withPrincipalOutstanding(loans: readonly ShgLoan[], paid: Map<string, number>): ShgLoan[] {
  return loans.map((loan) =>
    loan.source !== "recorded" || loan.interestModel === null || loan.repaymentMode === null
      ? loan
      : {
          ...loan,
          principalOutstanding: loanPrincipalOutstanding({
            principal: loan.principal,
            interestMonthlyPct: loan.interestMonthlyPct,
            disbursedAt: loan.disbursedAt,
            dueDate: loan.dueDate,
            interestModel: loan.interestModel,
            repaymentMode: loan.repaymentMode,
            paid: paid.get(loan.id) ?? 0,
          }),
        },
  );
}

/**
 * One row per member with a pre-app loan, from `openingBalance/current`.
 * `principal` is memberLoanTaken (every rupee borrowed before the app; it may
 * span several historical loans); `amountRepaid` is what has been collected in
 * the app against the opening balance; `principalOutstanding` is
 * OpeningOutstanding.loanFor. Interest on opening loans is not a contractual
 * total: the app charges it monthly (openingRepayments kind = interest).
 */
export function openingLoanRows(input: {
  groupId: string;
  maps: ShgOpeningMemberMaps;
  openingRepayments: readonly OpeningRepaymentRecord[];
  memberNames: Record<string, string>;
  asOf: Date | null;
}): ShgLoan[] {
  const { maps, openingRepayments: rows } = input;
  const ids = new Set([...Object.keys(maps.loanTaken), ...Object.keys(maps.loanBalanceOriginal), ...Object.keys(maps.loanBalance)]);
  const loans: ShgLoan[] = [];
  for (const memberId of [...ids].sort()) {
    const taken = maps.loanTaken[memberId] ?? 0;
    const atStart = openingLoanAtStart(memberId, maps, rows);
    if (taken <= 0 && atStart <= 0) continue;
    const owed = openingLoanOwed(memberId, maps, rows);
    loans.push({
      id: `opening:${memberId}`,
      source: "opening",
      groupId: input.groupId,
      memberId,
      memberName: input.memberNames[memberId] ?? "Unknown member",
      principal: taken,
      interestMonthlyPct: 0,
      amountRepaid: openingCollected(rows, "loan", memberId),
      disbursedAt: input.asOf,
      dueDate: null,
      status: owed > 0 ? "active" : "repaid",
      purpose: null,
      meetingId: null,
      interestModel: null,
      repaymentMode: null,
      interestKnown: false,
      tenureMonths: null,
      totalInterest: null,
      totalDue: null,
      outstanding: owed,
      principalOutstanding: owed,
      outstandingAtOpening: atStart,
    });
  }
  return loans;
}

export interface GroupRecords {
  now: Date;
  members: readonly { status: string; joinedAt: Date | null }[];
  /** Σ savings.amount by bucket, from server-side aggregations. */
  savings: { upToCurrentPeriod: number; afterCurrentPeriod: number; last30Days: number };
  /** Recorded loans, with principalOutstanding already filled (withPrincipalOutstanding). */
  loans: readonly ShgLoan[];
  opening: ShgOpeningBalance | null;
  openingRepayments: readonly OpeningRepaymentRecord[];
}

/** A group's position — every definition as documented on GroupFinancials. */
export function groupFinancials(r: GroupRecords): GroupFinancials {
  const since = r.now.getTime() - 30 * DAY_MS;
  const active = r.members.filter((m) => m.status === "active");
  const recorded = r.loans.filter((l) => l.source === "recorded");
  const open = recorded.filter((l) => l.status !== "repaid");
  const unknown = recorded.filter((l) => l.principalOutstanding === null);
  const openingSavings = r.opening?.totalSavings ?? 0;
  const recordedPrincipal = sum(recorded.map((l) => l.principal));
  const openingGiven = r.opening?.totalLoansGiven ?? 0;
  const recordedOutstanding = sum(recorded.map((l) => l.principalOutstanding ?? 0));
  // groupHistoricalLoanOutstanding: the group-level snapshot minus loan-kind collections.
  const openingOutstanding = Math.max((r.opening?.outstandingLoans ?? 0) - openingCollected(r.openingRepayments, "loan"), 0);
  return {
    members: {
      active: active.length,
      activeAddedLast30Days: active.filter((m) => m.joinedAt && m.joinedAt.getTime() >= since).length,
    },
    savings: {
      opening: openingSavings,
      recorded: r.savings.upToCurrentPeriod,
      advance: r.savings.afterCurrentPeriod,
      total: openingSavings + r.savings.upToCurrentPeriod,
      recordedLast30Days: r.savings.last30Days,
    },
    loans: {
      recordedPrincipal,
      recordedCount: recorded.length,
      openingGiven,
      totalRecorded: recordedPrincipal + openingGiven,
      recordedOutstanding,
      openingOutstanding,
      outstandingPrincipal: recordedOutstanding + openingOutstanding,
      openLoans: open.length,
      overdueLoans: open.filter((l) => l.status === "overdue").length,
      unknownFlexibleLoans: unknown.length,
      unknownFlexiblePrincipal: sum(unknown.map((l) => l.principal)),
    },
  };
}

/** Σ of several groups' financials (the cross-group overview). */
export function sumFinancials(all: readonly GroupFinancials[]): GroupFinancials {
  const add = <K extends keyof GroupFinancials>(key: K) =>
    Object.fromEntries(
      Object.keys(all[0]?.[key] ?? groupFinancials(EMPTY_GROUP)[key]).map((field) => [
        field,
        sum(all.map((f) => (f[key] as Record<string, number>)[field])),
      ]),
    ) as GroupFinancials[K];
  return { members: add("members"), savings: add("savings"), loans: add("loans") };
}

const EMPTY_GROUP: GroupRecords = {
  now: new Date(0),
  members: [],
  savings: { upToCurrentPeriod: 0, afterCurrentPeriod: 0, last30Days: 0 },
  loans: [],
  opening: null,
  openingRepayments: [],
};

export interface MemberRecords {
  memberId: string;
  /** `members.totalSavings`. */
  cachedTotalSavings: number;
  savingsEntries: readonly { amount: number }[];
  /** The member's recorded loans, with principalOutstanding filled. */
  loans: readonly ShgLoan[];
  maps: ShgOpeningMemberMaps;
  /** The group's opening repayments (filtered to the member here). */
  openingRepayments: readonly OpeningRepaymentRecord[];
  monthlyCharges: readonly { kind: string; amount: number }[];
  meetings: { attended: number; recorded: number };
  openingAsOf: Date | null;
}

/** MemberAccountSummary.of(member), field for field. */
export function memberAccount(r: MemberRecords): ShgMemberAccount {
  const id = r.memberId;
  const recorded = r.loans.filter((l) => l.source === "recorded");
  const openingSavings = r.maps.savings[id] ?? 0;
  const openingTaken = r.maps.loanTaken[id] ?? 0;
  const openingOutstanding = openingLoanOwed(id, r.maps, r.openingRepayments);
  const recordedPrincipal = sum(recorded.map((l) => l.principal));
  const recordedOutstanding = sum(recorded.map((l) => l.principalOutstanding ?? 0));
  const interestBefore = r.maps.interestPaid[id] ?? 0;
  const interestCollected = openingCollected(r.openingRepayments, "interest", id);
  const openingAtStart = openingLoanAtStart(id, r.maps, r.openingRepayments);
  const lateFeesPaidBefore = r.maps.lateFeesPaid[id] ?? 0;
  const lateFeeDue = openingLateFeeOwed(id, r.maps, r.openingRepayments);
  return {
    savings: {
      opening: openingSavings,
      recorded: r.cachedTotalSavings,
      recordedFromEntries: sum(r.savingsEntries.map((e) => e.amount)),
      entries: r.savingsEntries.length,
      total: openingSavings + r.cachedTotalSavings,
    },
    loans: {
      openingTaken,
      openingOutstandingAtStart: openingAtStart,
      openingCollected: openingCollected(r.openingRepayments, "loan", id),
      openingOutstanding,
      recordedPrincipal,
      recordedRepaid: sum(recorded.map((l) => l.amountRepaid)),
      recordedOutstanding,
      unknownFlexibleLoans: recorded.filter((l) => l.principalOutstanding === null).length,
      totalTaken: openingTaken + recordedPrincipal,
      outstandingPrincipal: recordedOutstanding + openingOutstanding,
    },
    interest: { openingPaidBeforeApp: interestBefore, openingCollected: interestCollected, total: interestBefore + interestCollected },
    fines: {
      openingDue: lateFeeDue,
      openingPaid: lateFeesPaidBefore + openingCollected(r.openingRepayments, "lateFee", id),
      monthlyLateFinesPaid: sum(r.monthlyCharges.filter((c) => c.kind === "lateFee").map((c) => c.amount)),
    },
    meetings: r.meetings,
    openingAsOf: r.openingAsOf,
    // MemberAccountSummary.hasOpening
    hasOpening: openingSavings > 0 || openingOutstanding > 0 || lateFeeDue > 0 || interestBefore > 0 || lateFeesPaidBefore > 0 || openingTaken > 0,
  };
}
