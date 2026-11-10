import "server-only";
import {
  emptyAssignedShgsResponse,
  emptyCommissionLedgerResponse,
  emptySettlementsResponse,
  unavailablePartnerPerformance,
} from "@/lib/partners/availability";
import type {
  PartnerAssignedShgsResponse,
  PartnerCommissionLedgerResponse,
  PartnerPerformanceSnapshot,
  PartnerSettlementsResponse,
} from "@/lib/partners/types";

/**
 * Partner dashboard data access for this web-only phase.
 *
 * SHG attribution and SaaS billing are not implemented yet. These helpers
 * return honest unavailable/empty payloads — never fabricated financials and
 * never SHG operational transactions.
 *
 * Inputs use the partners entity (`partnerNumber` / registry id), not employee
 * fields on Workforce records.
 */

export function getPartnerPerformance(partnerNumber: string): PartnerPerformanceSnapshot {
  void partnerNumber;
  return unavailablePartnerPerformance("awaiting_attribution");
}

export function getPartnerAssignedShgs(partnerNumber: string): PartnerAssignedShgsResponse {
  void partnerNumber;
  return emptyAssignedShgsResponse("awaiting_attribution");
}

export function getPartnerCommissionLedger(partnerNumber: string): PartnerCommissionLedgerResponse {
  void partnerNumber;
  return emptyCommissionLedgerResponse("billing_not_connected");
}

export function getPartnerSettlements(partnerNumber: string): PartnerSettlementsResponse {
  void partnerNumber;
  return emptySettlementsResponse("billing_not_connected");
}
