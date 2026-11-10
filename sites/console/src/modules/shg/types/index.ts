/**
 * SHG domain types shared by the console server (which maps Firestore
 * documents into them) and the browser (which only ever receives them as JSON
 * from /api/shg/*).
 *
 * They follow the SHG app's current DTOs on origin/main
 * (lib/core/sync/models/*_dto.dart) and its terminology. No Firestore types
 * leak through here.
 */

export type MemberRole = "president" | "secretary" | "member";

/** `MemberStatus` enum in the app: 0 active, 1 inactive (left), 2 suspended, 3 pending, 4 declined. */
export type MemberStatus = "active" | "left" | "suspended" | "pending" | "declined" | "unknown";

/** `LoanStatus` enum in the app: 0 pending, 1 active, 2 overdue, 3 repaid. */
export type LoanStatus = "pending" | "active" | "overdue" | "repaid" | "unknown";

/** `LoanInterestModel` (lib/core/finance/loan_schedule.dart): 0 flat, 1 reducingBalance. */
export type LoanInterestModel = "flat" | "reducingBalance";

/** `LoanRepaymentMode` (lib/core/finance/loan_schedule.dart): 0 emi, 1 flexible. */
export type LoanRepaymentMode = "emi" | "flexible";

/** `ClosureStatus` enum in the app: 0 open, 1 closed, 2 reopened. */
export type ClosureStatus = "open" | "closed" | "reopened" | "unknown";

export interface ShgGroup {
  id: string;
  name: string;
  village: string;
  formationDate: Date | null;
  /** ₹ each member is expected to save per month (current group setting). */
  monthlySavings: number;
  /** Day of month (1–28) the group meets. */
  meetingDay: number | null;
  /** Default loan interest, % per month. */
  loanInterestMonthlyPct: number;
  latePenalty: number;
  paymentGraceDays: number | null;
  hasBankAccount: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * A group's financial position, built from the underlying records with the SHG
 * app's own formulas (origin/main FinancialEngine / OpeningPosition). Every
 * figure that combines opening (pre-app) and recorded (in-app) data keeps both
 * parts, so the console can always show where a total comes from.
 */
export interface GroupFinancials {
  members: {
    /** statusIndex 0 (the app's active participants). */
    active: number;
    /** Active members whose `joinedAt` is within the last 30 days. */
    activeAddedLast30Days: number;
  };
  savings: {
    /** `openingBalance/current.totalSavings` (OpeningPosition.groupSavings). */
    opening: number;
    /** Σ `savings.amount` with `period` ≤ the current IST month, reversals included (groupTotalSavingsUpTo). */
    recorded: number;
    /** Σ `savings.amount` with `period` after the current month: advances, counted once their month arrives. */
    advance: number;
    /** opening + recorded — the app's "Total Group Savings". */
    total: number;
    /** Σ `savings.amount` whose payment `date` is within the last 30 days. */
    recordedLast30Days: number;
  };
  loans: {
    /** Σ `loans.principal` (in-app loans). */
    recordedPrincipal: number;
    recordedCount: number;
    /** `openingBalance/current.totalLoansGiven` (OpeningPosition.groupLoansGiven). */
    openingGiven: number;
    /** recordedPrincipal + openingGiven — FinancialEngine.groupTotalDisbursed (disjoint by construction). */
    totalRecorded: number;
    /** Σ loanPrincipalOutstanding over in-app loans whose principal is derivable. */
    recordedOutstanding: number;
    /** max(0, opening.outstandingLoans − Σ openingRepayments[kind = loan]) — groupHistoricalLoanOutstanding. */
    openingOutstanding: number;
    /** recordedOutstanding + openingOutstanding — groupTotalPrincipalOutstanding (principal only, no interest). */
    outstandingPrincipal: number;
    /** In-app loans not repaid: statusIndex pending / active / overdue. */
    openLoans: number;
    overdueLoans: number;
    /** Flexible loans with repayments: principal outstanding not derivable from cloud data (excluded above). */
    unknownFlexibleLoans: number;
    unknownFlexiblePrincipal: number;
  };
}

export interface ShgMember {
  id: string;
  groupId: string;
  name: string;
  phone: string;
  role: MemberRole;
  status: MemberStatus;
  /** Cosmetic admin badge in the app; group authority is `groups.adminUid`. */
  isAdmin: boolean;
  monthlyTarget: number;
  /** Cached by the app from savings entries; display only. */
  cachedTotalSavings: number;
  joinedAt: Date | null;
  leftAt: Date | null;
}

export interface ShgLoan {
  id: string;
  /**
   * "recorded": a `loans` document (in-app loan).
   * "opening": a member's pre-app loan from `openingBalance/current`
   * (memberLoanTaken / memberLoanBalanceOriginal). The app never creates a
   * `loans` document from opening data, so the two never describe the same loan.
   */
  source: "recorded" | "opening";
  groupId: string;
  memberId: string;
  memberName: string;
  principal: number;
  interestMonthlyPct: number;
  amountRepaid: number;
  disbursedAt: Date | null;
  /** For a flexible loan the app stamps this equal to disbursedAt; it is not a deadline. */
  dueDate: Date | null;
  status: LoanStatus;
  purpose: string | null;
  meetingId: string | null;
  /** null for opening loans: their interest is charged monthly as opening-interest collections. */
  interestModel: LoanInterestModel | null;
  repaymentMode: LoanRepaymentMode | null;
  /**
   * False for flexible loans: their interest is charged month by month into
   * the app's device-local LoanInterestChargeRepository (Hive) and is never
   * synced to Firestore, so cloud data cannot determine it.
   */
  interestKnown: boolean;
  /** Whole months, clamped to [1, 120]; null for flexible loans (no tenure). */
  tenureMonths: number | null;
  /** null when `interestKnown` is false. */
  totalInterest: number | null;
  totalDue: number | null;
  /** totalDue − amountRepaid: the member's remaining payoff (principal + contractual interest). */
  outstanding: number | null;
  /**
   * Principal still owed (FinancialEngine.loanPrincipalOutstanding; for an
   * opening loan, OpeningOutstanding.loanFor). null when not derivable from
   * cloud data (a flexible loan with repayments).
   */
  principalOutstanding: number | null;
  /** Opening loans only: the balance still owed when the group started using the app. */
  outstandingAtOpening: number | null;
}

/**
 * Money movements recorded by the app:
 *   saving             `savings`             savings payment (negative = reversal)
 *   repayment          `repayments`          in-app loan repayment
 *   opening-repayment  `openingRepayments`   collection against an opening loan / late fee, or opening-loan interest
 *   monthly-charge     `monthlyCharges`      monthly charge collected (late fine)
 * Not payments, used only in member history and reports:
 *   disbursement       `loans`               a loan given (money out)
 *   opening-balance    `openingBalance`      pre-app position captured by the Existing Group Savings wizard
 */
export type TransactionKind = "saving" | "repayment" | "disbursement" | "opening-repayment" | "monthly-charge" | "opening-balance";

export interface ShgTransaction {
  /** Unique across kinds: `${kind}:${groupId}:${id}`. */
  key: string;
  id: string;
  groupId: string;
  kind: TransactionKind;
  memberId: string;
  memberName: string | null;
  /** Negative for reversals (the app's append-only reversal convention). */
  amount: number;
  date: Date | null;
  /** Cash period (`YYYY-MM`) where the record carries one. */
  period: string | null;
  isReversal: boolean;
  notes: string | null;
  loanId: string | null;
  meetingId: string | null;
  /** Opening repayments: "loan" | "lateFee" | "interest". Opening balance entries: "savings" | "loanTaken" | "loanOutstanding" | "interestPaid" | "lateFeesPaid" | "lateFeesDue". */
  openingKind: string | null;
  /** Monthly charges: the charge kind (e.g. "lateFee") and the period it settles. */
  chargeKind: string | null;
  appliesToPeriod: string | null;
}

export interface ShgMeeting {
  id: string;
  groupId: string;
  date: Date | null;
  period: string | null;
  attendeeCount: number;
  totalMembers: number;
  savingsCollected: number;
  loansDisbursed: number;
  loansRepaid: number;
  extraIncome: number;
  moneySpent: number;
  extraIncomeDesc: string | null;
  moneySpentDesc: string | null;
  /** Whether this meeting's financial records carry a real `meetingId`. */
  attributedRecords: boolean;
}

/** Balances captured by the app's "Existing Group Savings" wizard (pre-app history). */
export interface ShgOpeningBalance {
  totalSavings: number;
  outstandingLoans: number;
  totalLoansGiven: number;
  totalInterestCollected: number;
  totalLateFeesCollected: number;
  otherIncome: number;
  otherExpense: number;
  /** When the opening position was captured (document createdAt, else updatedAt). */
  asOf: Date | null;
  updatedAt: Date | null;
}

/**
 * Per-member opening allocations in `openingBalance/current`, keyed by member
 * document id (the app's MemberOpening*Draft maps). Server-side only.
 */
export interface ShgOpeningMemberMaps {
  savings: Record<string, number>;
  loanTaken: Record<string, number>;
  /** Legacy, decremented on collection; the truth only for members without an original. */
  loanBalance: Record<string, number>;
  /** Immutable balance at opening (schema v2). */
  loanBalanceOriginal: Record<string, number>;
  lateFeesDue: Record<string, number>;
  lateFeesDueOriginal: Record<string, number>;
  lateFeesPaid: Record<string, number>;
  interestPaid: Record<string, number>;
}

/** A month's closing snapshot written by the app (`monthlyClosures/{period}`). */
export interface ShgMonthlyClosure {
  period: string;
  status: ClosureStatus;
  closingBalance: number;
  totalSavings: number;
  totalLoanRepayments: number;
  totalInterest: number;
  totalExpenses: number;
  totalOtherIncome: number;
  totalLateFines: number;
  closedAt: Date | null;
  reopenedAt: Date | null;
}

/** One effective-dated snapshot of the group's financial rules (`ruleVersions`). */
export interface ShgRuleVersion {
  id: string;
  /** First period (`YYYY-MM`) this version governs. */
  effectiveFrom: string;
  revision: number;
  monthlySavings: number;
  latePenalty: number;
  meetingDay: number;
  graceDays: number;
  updatedAt: Date | null;
}

/** Aggregates across every group: Σ of each group's GroupFinancials. */
export interface ShgOverview {
  groups: number;
  /** Groups whose `createdAt` (added to the app) is within the last 30 days. */
  groupsAddedLast30Days: number;
  members: GroupFinancials["members"];
  savings: GroupFinancials["savings"];
  loans: GroupFinancials["loans"];
  /** Up to 10 groups by total savings (opening + recorded), highest first. */
  topGroupsBySavings: { id: string; name: string; village: string; savings: number; openingSavings: number; recordedSavings: number }[];
  /** The instant "last 30 days" and "current month" were evaluated at. */
  asOf: Date;
}

export interface ShgGroupDetail {
  group: ShgGroup;
  financials: GroupFinancials;
  openingBalance: ShgOpeningBalance | null;
}

/**
 * One member's complete position, mirroring the app's MemberAccountSummary
 * (lib/core/finance/member_account.dart) on origin/main.
 */
export interface ShgMemberAccount {
  savings: {
    /** openingBalance.memberSavings[memberId]. */
    opening: number;
    /** `members.totalSavings`: the app's own recorded-savings figure for the member. */
    recorded: number;
    /** Σ of the member's `savings` records (reversals included), for reconciliation with `recorded`. */
    recordedFromEntries: number;
    entries: number;
    /** opening + recorded — MemberAccountSummary.savings. */
    total: number;
  };
  loans: {
    /** openingBalance.memberLoanTaken[memberId]: every rupee borrowed before the app. */
    openingTaken: number;
    /** Opening loan balance when the group started using the app. */
    openingOutstandingAtStart: number;
    /** Σ openingRepayments[kind = loan] for the member (signed). */
    openingCollected: number;
    /** OpeningOutstanding.loanFor(memberId). */
    openingOutstanding: number;
    /** Σ in-app loan principal. */
    recordedPrincipal: number;
    /** Σ in-app loans' amountRepaid (principal + interest). */
    recordedRepaid: number;
    /** Σ loanPrincipalOutstanding over in-app loans whose principal is derivable. */
    recordedOutstanding: number;
    unknownFlexibleLoans: number;
    /** openingTaken + recordedPrincipal — MemberAccountSummary.totalLoanTakenTillDate. */
    totalTaken: number;
    /** recordedOutstanding + openingOutstanding — MemberAccountSummary.outstandingLoan (principal only). */
    outstandingPrincipal: number;
  };
  interest: {
    /** openingBalance.memberInterestPaid[memberId]. */
    openingPaidBeforeApp: number;
    /** Σ openingRepayments[kind = interest]. */
    openingCollected: number;
    /** Sum of the two — MemberAccountSummary.openingInterestPaid. */
    total: number;
  };
  fines: {
    /** OpeningOutstanding.lateFeeFor(memberId): opening late fee still owed. */
    openingDue: number;
    /** openingBalance.memberLateFeesPaid[memberId] + Σ openingRepayments[kind = lateFee]. */
    openingPaid: number;
    /** Σ monthlyCharges[kind = lateFee] — MemberAccountSummary.monthlyLateFinesPaid. */
    monthlyLateFinesPaid: number;
  };
  meetings: { attended: number; recorded: number };
  openingAsOf: Date | null;
  hasOpening: boolean;
}

export interface ShgMemberDetail {
  member: ShgMember;
  account: ShgMemberAccount;
  loans: ShgLoan[];
  /** Every financial record for the member, newest first (opening position included). */
  history: { items: ShgTransaction[]; truncated: boolean };
}

/** One month of a group's report. Cash figures are computed from the records themselves. */
export interface ShgReportMonth {
  period: string;
  savings: number;
  loanRepayments: number;
  openingRepayments: number;
  lateFeesCollected: number;
  loansDisbursed: number;
  otherIncome: number;
  expenses: number;
  meetings: number;
  /** The app's own closing snapshot for the period, when the month has been closed. */
  closure: ShgMonthlyClosure | null;
  /** The rule version governing this period (app ordering rule). */
  rules: ShgRuleVersion | null;
}

export interface ShgReport {
  groupId: string;
  year: number;
  months: ShgReportMonth[];
  totals: Omit<ShgReportMonth, "period" | "closure" | "rules">;
  ruleVersions: ShgRuleVersion[];
  openingBalance: ShgOpeningBalance | null;
}

export type { Page, PageCursor } from "@/lib/pagination";
