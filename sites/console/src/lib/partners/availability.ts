import { COMMISSION_POLICY_V1 } from "./model.ts";
import type {
  MetricValue,
  PartnerAssignedShgsResponse,
  PartnerCommissionLedgerResponse,
  PartnerPerformanceSnapshot,
  PartnerSettlementsResponse,
} from "./types.ts";

const unavailable = (reason: "awaiting_attribution" | "billing_not_connected"): MetricValue => ({
  state: "unavailable",
  reason,
});

/** Honest empty performance payload: no fabricated ₹0 earnings. */
export function unavailablePartnerPerformance(
  reason: "awaiting_attribution" | "billing_not_connected" = "awaiting_attribution",
): PartnerPerformanceSnapshot {
  const metric = unavailable(reason);
  return {
    availability: { state: "unavailable", reason },
    policy: COMMISSION_POLICY_V1,
    portfolio: {
      totalAssignedShgs: metric,
      currentlyFreeShgs: metric,
      currentlyPaidShgs: metric,
      newShgsThisMonth: metric,
      newPaidSubscriptionsThisMonth: metric,
      freeToPaidThisMonth: metric,
      renewalsThisMonth: metric,
      cancelledOrExpired: metric,
    },
    revenue: {
      lifetimeCollections: metric,
      monthCollections: metric,
      newSubscriptionCollections: metric,
      renewalCollections: metric,
      refundsAndReversals: metric,
      netCollected: metric,
    },
    commission: {
      lifetimeEarned: metric,
      monthEarned: metric,
      newOnboardingEarned: metric,
      renewalEarned: metric,
      settled: metric,
      pendingSettlement: metric,
    },
  };
}

export function emptyAssignedShgsResponse(
  reason: "awaiting_attribution" | "billing_not_connected" = "awaiting_attribution",
): PartnerAssignedShgsResponse {
  return { availability: { state: "unavailable", reason }, items: [], nextCursor: null };
}

export function emptyCommissionLedgerResponse(
  reason: "awaiting_attribution" | "billing_not_connected" = "billing_not_connected",
): PartnerCommissionLedgerResponse {
  return {
    availability: { state: "unavailable", reason },
    policy: COMMISSION_POLICY_V1,
    items: [],
    nextCursor: null,
  };
}

export function emptySettlementsResponse(
  reason: "awaiting_attribution" | "billing_not_connected" = "billing_not_connected",
): PartnerSettlementsResponse {
  return {
    availability: { state: "unavailable", reason },
    mutationsEnabled: false,
    items: [],
    nextCursor: null,
  };
}

export function availabilityMessage(reason: "awaiting_attribution" | "billing_not_connected"): string {
  if (reason === "billing_not_connected") {
    return "Billing not connected. Commission and revenue figures will appear after subscription billing is integrated.";
  }
  return "Awaiting SHG attribution. Assigned groups and portfolio metrics will appear after the SHG app records Partner ID attribution.";
}
