import { Chip, Tooltip } from "@heroui/react";
import { formatCurrency } from "@/lib/format";
import type { LoanStatus, MemberRole, MemberStatus, ShgLoan, ShgTransaction, TransactionKind } from "../types";

type ChipColor = "default" | "accent" | "success" | "warning" | "danger";

const LOAN_STATUS: Record<LoanStatus, { label: string; color: ChipColor }> = {
  pending: { label: "Pending", color: "default" },
  active: { label: "Active", color: "accent" },
  overdue: { label: "Overdue", color: "danger" },
  repaid: { label: "Repaid", color: "success" },
  unknown: { label: "Unknown", color: "default" },
};

const MEMBER_STATUS: Record<MemberStatus, { label: string; color: ChipColor }> = {
  active: { label: "Active", color: "success" },
  left: { label: "Left", color: "default" },
  suspended: { label: "Suspended", color: "warning" },
  pending: { label: "Pending", color: "warning" },
  declined: { label: "Declined", color: "default" },
  unknown: { label: "Unknown", color: "default" },
};

export const ROLE_LABEL: Record<MemberRole, string> = {
  president: "President",
  secretary: "Secretary",
  member: "Member",
};

/** One label per record kind (used by the Type filter). */
export const TRANSACTION_KIND_LABEL: Record<TransactionKind, string> = {
  saving: "Savings payment",
  repayment: "Loan repayment",
  disbursement: "Loan given",
  "opening-repayment": "Opening balance collection",
  "monthly-charge": "Late fine",
  "opening-balance": "Opening balance",
};

const OPENING_COLLECTION_LABEL: Record<string, string> = {
  loan: "Opening loan repayment",
  lateFee: "Opening late fee payment",
  interest: "Opening loan interest",
};

const OPENING_BALANCE_LABEL: Record<string, string> = {
  savings: "Opening savings",
  loanTaken: "Loans taken before the app",
  loanOutstanding: "Opening loan balance",
  interestPaid: "Interest paid before the app",
  lateFeesPaid: "Late fees paid before the app",
  lateFeesDue: "Opening late fee due",
};

/** The specific label for one record, in the SHG app's terms. */
export function transactionLabel(t: Pick<ShgTransaction, "kind" | "openingKind" | "chargeKind">): string {
  if (t.kind === "opening-repayment") return OPENING_COLLECTION_LABEL[t.openingKind ?? "loan"] ?? TRANSACTION_KIND_LABEL[t.kind];
  if (t.kind === "opening-balance") return OPENING_BALANCE_LABEL[t.openingKind ?? ""] ?? TRANSACTION_KIND_LABEL[t.kind];
  if (t.kind === "monthly-charge" && t.chargeKind && t.chargeKind !== "lateFee") return `Monthly charge (${t.chargeKind})`;
  return TRANSACTION_KIND_LABEL[t.kind];
}

/** How a loan's interest and repayment work (origin/main LoanInterestModel × LoanRepaymentMode). */
export function loanTermsLabel(loan: Pick<ShgLoan, "interestModel" | "repaymentMode" | "source">): string {
  if (loan.source === "opening") return "Opening · monthly interest";
  if (loan.repaymentMode === "flexible") return "Flexible (no EMI)";
  return loan.interestModel === "reducingBalance" ? "EMI · reducing balance" : "EMI · flat";
}

export const FLEXIBLE_LOAN_LIMITATION =
  "Flexible loans are charged interest month by month on the members' devices (stored only in the SHG app's local storage, never synced). Cloud data cannot determine their interest, total due or outstanding, so the console does not estimate them.";

export const OPENING_LOAN_NOTE =
  "A loan from before the group used the app, from the Existing Group Savings wizard. Its interest is not a fixed total: the app charges it each month on the remaining balance and records it as an opening-interest collection.";

/** A loan amount, or an explicit "not in cloud data" marker for flexible loans. */
export function LoanAmount({ value }: { value: number | null }) {
  if (value !== null) return <>{formatCurrency(value)}</>;
  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger aria-label="Why is this unavailable?">
        <span className="cursor-help text-muted underline decoration-dotted underline-offset-4">Not in cloud data</span>
      </Tooltip.Trigger>
      <Tooltip.Content className="max-w-xs">{FLEXIBLE_LOAN_LIMITATION}</Tooltip.Content>
    </Tooltip>
  );
}

export function LoanStatusChip({ status }: { status: LoanStatus }) {
  const { label, color } = LOAN_STATUS[status];
  return (
    <Chip size="sm" variant="soft" color={color}>
      {label}
    </Chip>
  );
}

export function MemberStatusChip({ status }: { status: MemberStatus }) {
  const { label, color } = MEMBER_STATUS[status];
  return (
    <Chip size="sm" variant="soft" color={color}>
      {label}
    </Chip>
  );
}

export function AdminChip() {
  return (
    <Chip size="sm" variant="soft" color="accent">
      Admin
    </Chip>
  );
}
