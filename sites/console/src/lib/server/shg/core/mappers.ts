/**
 * Firestore document → SHG domain mappers. Defaults follow each DTO's
 * `fromMap` on origin/main (lib/core/sync/models/*_dto.dart), so older
 * documents read exactly as the app reads them.
 *
 * Fields the console never exposes are deliberately not mapped: bank details,
 * invite codes, adminUid, member idNumber/address.
 */
import { Timestamp } from "@google-cloud/firestore";
import { interestModelFromIndex, loanFigures, repaymentModeFromIndex } from "../../../../modules/shg/domain/loan-math.ts";
import type {
  ClosureStatus,
  LoanStatus,
  MemberRole,
  MemberStatus,
  ShgGroup,
  ShgLoan,
  ShgMeeting,
  ShgMember,
  ShgMonthlyClosure,
  ShgOpeningBalance,
  ShgOpeningMemberMaps,
  ShgTransaction,
} from "../../../../modules/shg/types/index.ts";
import type { RuleVersionForOrdering } from "../../../../modules/shg/domain/rules.ts";

/** The minimal snapshot shape the mappers need (satisfied by Firestore snapshots and test fixtures). */
export interface DocLike {
  id: string;
  ref: { path: string; parent: { parent: { id: string } | null } };
  data(): Record<string, unknown> | undefined;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const date = (v: unknown): Date | null => (v instanceof Timestamp ? v.toDate() : null);

/** The group a subcollection document belongs to, from its path (groups/{groupId}/…). */
export const groupIdOf = (snap: DocLike): string => snap.ref.parent.parent?.id ?? "";

const MEMBER_ROLES: MemberRole[] = ["member", "secretary", "president"];
const MEMBER_STATUSES: MemberStatus[] = ["active", "left", "suspended", "pending", "declined"];
const LOAN_STATUSES: LoanStatus[] = ["pending", "active", "overdue", "repaid"];
const CLOSURE_STATUSES: ClosureStatus[] = ["open", "closed", "reopened"];

export const LOAN_STATUS_INDEX = { pending: 0, active: 1, overdue: 2, repaid: 3 } as const;
export const ACTIVE_MEMBER_STATUS_INDEX = 0;

export function toGroup(snap: DocLike): ShgGroup {
  const d = snap.data() ?? {};
  return {
    id: snap.id,
    name: str(d.groupName) || "Untitled group",
    village: str(d.villageName),
    formationDate: date(d.formationDate),
    monthlySavings: num(d.monthlySavings),
    meetingDay: numOrNull(d.meetingDay),
    loanInterestMonthlyPct: num(d.loanInterest),
    latePenalty: num(d.latePenalty),
    paymentGraceDays: numOrNull(d.paymentGraceDays),
    hasBankAccount: d.hasBankAccount === true,
    createdAt: date(d.createdAt),
    updatedAt: date(d.updatedAt),
  };
}

export function toMember(snap: DocLike): ShgMember {
  const d = snap.data() ?? {};
  return {
    id: snap.id,
    groupId: groupIdOf(snap),
    name: str(d.name) || "Unnamed member",
    phone: str(d.phone),
    role: MEMBER_ROLES[num(d.roleIndex)] ?? "member",
    status: MEMBER_STATUSES[num(d.statusIndex)] ?? "unknown",
    isAdmin: d.hasAdminAccess === true,
    monthlyTarget: num(d.monthlyTarget),
    cachedTotalSavings: num(d.totalSavings),
    joinedAt: date(d.joinedAt),
    leftAt: date(d.leftAt),
  };
}

export function toLoan(snap: DocLike): ShgLoan {
  const d = snap.data() ?? {};
  const base = {
    principal: num(d.principal),
    interestMonthlyPct: num(d.interestRate),
    amountRepaid: num(d.amountRepaid),
    disbursedAt: date(d.disbursedAt),
    dueDate: date(d.dueDate),
    // Absent → 0 (LoanDto.fromMap); out of range → flat / emi (Loan getters).
    interestModel: interestModelFromIndex(d.interestModelIndex ?? 0),
    repaymentMode: repaymentModeFromIndex(d.repaymentModeIndex ?? 0),
  };
  return {
    id: snap.id,
    source: "recorded",
    groupId: groupIdOf(snap),
    memberId: str(d.memberId),
    memberName: str(d.memberName) || "Unknown member",
    status: LOAN_STATUSES[num(d.statusIndex)] ?? "unknown",
    purpose: strOrNull(d.purpose),
    meetingId: strOrNull(d.meetingId),
    ...base,
    ...loanFigures(base),
    // Needs the loan's repayment records: filled by withPrincipalOutstanding.
    principalOutstanding: null,
    outstandingAtOpening: null,
  };
}

function baseTx(snap: DocLike, kind: ShgTransaction["kind"]) {
  const groupId = groupIdOf(snap);
  return { key: `${kind}:${groupId}:${snap.id}`, id: snap.id, groupId, kind };
}

export function savingToTransaction(snap: DocLike): ShgTransaction {
  const d = snap.data() ?? {};
  return {
    ...baseTx(snap, "saving"),
    memberId: str(d.memberId),
    memberName: strOrNull(d.memberName),
    amount: num(d.amount),
    date: date(d.date),
    period: strOrNull(d.period),
    isReversal: strOrNull(d.reversalOf) !== null || num(d.amount) < 0,
    notes: strOrNull(d.notes),
    loanId: null,
    meetingId: strOrNull(d.meetingId),
    openingKind: null,
    chargeKind: null,
    appliesToPeriod: null,
  };
}

export function repaymentToTransaction(snap: DocLike): ShgTransaction {
  const d = snap.data() ?? {};
  return {
    ...baseTx(snap, "repayment"),
    memberId: str(d.memberId),
    memberName: strOrNull(d.memberName),
    amount: num(d.amount),
    date: date(d.date),
    period: null,
    isReversal: strOrNull(d.reversalOf) !== null || num(d.amount) < 0,
    notes: strOrNull(d.notes),
    loanId: strOrNull(d.loanId),
    meetingId: strOrNull(d.meetingId),
    openingKind: null,
    chargeKind: null,
    appliesToPeriod: null,
  };
}

export function disbursementToTransaction(snap: DocLike): ShgTransaction {
  const d = snap.data() ?? {};
  return {
    ...baseTx(snap, "disbursement"),
    memberId: str(d.memberId),
    memberName: strOrNull(d.memberName),
    amount: num(d.principal),
    date: date(d.disbursedAt),
    period: null,
    isReversal: false,
    notes: strOrNull(d.purpose),
    loanId: snap.id,
    meetingId: strOrNull(d.meetingId),
    openingKind: null,
    chargeKind: null,
    appliesToPeriod: null,
  };
}

export function openingRepaymentToTransaction(snap: DocLike): ShgTransaction {
  const d = snap.data() ?? {};
  return {
    ...baseTx(snap, "opening-repayment"),
    memberId: str(d.memberId),
    // Opening repayments do not denormalise the member name.
    memberName: null,
    amount: num(d.amount),
    date: date(d.date),
    period: strOrNull(d.period),
    isReversal: strOrNull(d.reversalOf) !== null || num(d.amount) < 0,
    notes: null,
    loanId: null,
    meetingId: strOrNull(d.meetingId),
    // OpeningRepaymentDto.fromMap defaults the kind to "loan".
    openingKind: str(d.kind) || "loan",
    chargeKind: null,
    appliesToPeriod: null,
  };
}

export function monthlyChargeToTransaction(snap: DocLike): ShgTransaction {
  const d = snap.data() ?? {};
  return {
    ...baseTx(snap, "monthly-charge"),
    memberId: str(d.memberId),
    memberName: strOrNull(d.memberName),
    // Signed: positive for a collection, negative only for a reversal.
    amount: num(d.amount),
    date: date(d.date),
    period: strOrNull(d.period),
    isReversal: strOrNull(d.reversalOf) !== null || num(d.amount) < 0,
    notes: null,
    loanId: null,
    meetingId: strOrNull(d.meetingId),
    openingKind: null,
    // MonthlyChargeDto.fromMap defaults the kind to "lateFee".
    chargeKind: str(d.kind) || "lateFee",
    appliesToPeriod: strOrNull(d.appliesToPeriod),
  };
}

export function toMeeting(snap: DocLike): ShgMeeting {
  const d = snap.data() ?? {};
  return {
    id: snap.id,
    groupId: groupIdOf(snap),
    date: date(d.date),
    period: strOrNull(d.period),
    attendeeCount: Array.isArray(d.attendeeIds) ? d.attendeeIds.length : 0,
    totalMembers: num(d.totalMembers),
    savingsCollected: num(d.savingsCollected),
    loansDisbursed: num(d.loansDisbursed),
    loansRepaid: num(d.loansRepaid),
    extraIncome: num(d.extraIncome),
    moneySpent: num(d.moneySpent),
    extraIncomeDesc: strOrNull(d.extraIncomeDesc),
    moneySpentDesc: strOrNull(d.moneySpentDesc),
    attributedRecords: d.attributedRecords === true,
  };
}

export function toOpeningBalance(snap: { exists: boolean } & Omit<DocLike, "ref" | "id">): ShgOpeningBalance | null {
  if (!snap.exists) return null;
  const d = snap.data() ?? {};
  return {
    totalSavings: num(d.totalSavings),
    outstandingLoans: num(d.outstandingLoans),
    totalLoansGiven: num(d.totalLoansGiven),
    totalInterestCollected: num(d.totalInterestCollected),
    totalLateFeesCollected: num(d.totalLateFeesCollected),
    otherIncome: num(d.otherIncome),
    otherExpense: num(d.otherExpense),
    asOf: date(d.createdAt) ?? date(d.updatedAt),
    updatedAt: date(d.updatedAt),
  };
}

/** OpeningBalanceDto.fromMap's readMap: string keys with numeric values only. */
function numberMap(v: unknown): Record<string, number> {
  if (!v || typeof v !== "object" || v instanceof Timestamp) return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) if (typeof val === "number" && Number.isFinite(val)) out[k] = val;
  return out;
}

/** The per-member opening allocations, keyed by member document id. */
export function toOpeningMemberMaps(snap: { exists: boolean } & Omit<DocLike, "ref" | "id">): ShgOpeningMemberMaps {
  const d = (snap.exists ? snap.data() : undefined) ?? {};
  return {
    savings: numberMap(d.memberSavings),
    loanTaken: numberMap(d.memberLoanTaken),
    loanBalance: numberMap(d.memberLoanBalance),
    loanBalanceOriginal: numberMap(d.memberLoanBalanceOriginal),
    lateFeesDue: numberMap(d.memberLateFeesDue),
    lateFeesDueOriginal: numberMap(d.memberLateFeesDueOriginal),
    lateFeesPaid: numberMap(d.memberLateFeesPaid),
    interestPaid: numberMap(d.memberInterestPaid),
  };
}

export function toMonthlyClosure(snap: DocLike): ShgMonthlyClosure {
  const d = snap.data() ?? {};
  return {
    period: str(d.period) || snap.id,
    status: CLOSURE_STATUSES[num(d.statusIndex)] ?? "unknown",
    closingBalance: num(d.closingBalance),
    totalSavings: num(d.totalSavings),
    totalLoanRepayments: num(d.totalLoanRepayments),
    totalInterest: num(d.totalInterest),
    totalExpenses: num(d.totalExpenses),
    totalOtherIncome: num(d.totalOtherIncome),
    totalLateFines: num(d.totalLateFines),
    closedAt: date(d.closedAt),
    reopenedAt: date(d.reopenedAt),
  };
}

export function toRuleVersion(snap: DocLike): RuleVersionForOrdering | null {
  const d = snap.data() ?? {};
  // GroupRuleStore ignores a version without an effectiveFrom.
  const effectiveFrom = strOrNull(d.effectiveFrom);
  if (!effectiveFrom) return null;
  return {
    id: snap.id,
    effectiveFrom,
    revision: num(d.revision),
    monthlySavings: num(d.monthlySavings),
    latePenalty: num(d.latePenalty),
    meetingDay: num(d.meetingDay),
    graceDays: num(d.graceDays),
    updatedAt: date(d.updatedAt),
    updatedByUid: str(d.updatedByUid),
  };
}
