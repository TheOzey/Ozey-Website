/**
 * Data contracts for Partner Performance, Assigned SHGs, Commission Ledger and
 * Settlements. Billing and SHG attribution are not connected yet — APIs return
 * unavailable/empty payloads rather than fabricated zeros.
 */

import type { COMMISSION_POLICY_V1 } from "./model.ts";

export type DataAvailability =
  | { state: "unavailable"; reason: "awaiting_attribution" | "billing_not_connected" }
  | { state: "ready" };

export type MetricValue =
  | { state: "unavailable"; reason: "awaiting_attribution" | "billing_not_connected" }
  | { state: "ready"; value: number };

export type CommissionPaymentType = "new_onboarding" | "renewal";

export type CommissionEntryStatus = "pending" | "eligible" | "settled" | "reversed";

/** Future ledger row — never synthesised with mock amounts in this phase. */
export interface CommissionLedgerEntry {
  id: string;
  partnerNumber: string;
  groupId: string;
  groupName: string | null;
  sourcePaymentId: string;
  paymentType: CommissionPaymentType;
  collectionAmount: number;
  commissionRate: number;
  calculationBasis: string;
  commissionAmount: number;
  policyVersion: string;
  entryDate: string;
  status: CommissionEntryStatus;
  settlementId: string | null;
  reversalOf: string | null;
}

export interface SettlementRow {
  id: string;
  month: string;
  newOnboardingCommission: number;
  renewalCommission: number;
  reversals: number;
  eligibleCommission: number;
  previouslySettled: number;
  pendingAmount: number;
  settlementAmount: number;
  settledAt: string | null;
  paymentReference: string | null;
  recordedByEmployeeNumber: string | null;
}

export interface AssignedShgRow {
  groupId: string;
  groupName: string;
  village: string | null;
  partnerNumber: string;
  attributedAt: string;
  subscriptionStatus: "free" | "paid" | "cancelled" | "expired" | "unknown";
  subscriptionStartAt: string | null;
  nextRenewalAt: string | null;
  lastPaymentStatus: "succeeded" | "failed" | "refunded" | "none" | "unknown";
}

export interface PartnerPerformanceSnapshot {
  availability: DataAvailability;
  policy: typeof COMMISSION_POLICY_V1;
  portfolio: {
    totalAssignedShgs: MetricValue;
    currentlyFreeShgs: MetricValue;
    currentlyPaidShgs: MetricValue;
    newShgsThisMonth: MetricValue;
    newPaidSubscriptionsThisMonth: MetricValue;
    freeToPaidThisMonth: MetricValue;
    renewalsThisMonth: MetricValue;
    cancelledOrExpired: MetricValue;
  };
  revenue: {
    lifetimeCollections: MetricValue;
    monthCollections: MetricValue;
    newSubscriptionCollections: MetricValue;
    renewalCollections: MetricValue;
    refundsAndReversals: MetricValue;
    netCollected: MetricValue;
  };
  commission: {
    lifetimeEarned: MetricValue;
    monthEarned: MetricValue;
    newOnboardingEarned: MetricValue;
    renewalEarned: MetricValue;
    settled: MetricValue;
    pendingSettlement: MetricValue;
  };
}

export interface PartnerAssignedShgsResponse {
  availability: DataAvailability;
  items: AssignedShgRow[];
  nextCursor: string | null;
}

export interface PartnerCommissionLedgerResponse {
  availability: DataAvailability;
  policy: typeof COMMISSION_POLICY_V1;
  items: CommissionLedgerEntry[];
  nextCursor: string | null;
}

export interface PartnerSettlementsResponse {
  availability: DataAvailability;
  /** Settlement recording is disabled until a commission ledger exists. */
  mutationsEnabled: false;
  items: SettlementRow[];
  nextCursor: string | null;
}
