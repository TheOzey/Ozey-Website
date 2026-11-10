/**
 * Partner / commission authorization boundaries.
 *
 * - Directory, overview, performance, assigned SHGs → console:partners.read
 *   (console:partners.manage also grants partner read)
 * - Commission ledger & settlements → console:commissions.read (independent)
 * - Create / edit / deactivate → console:partners.manage
 * - Settlement mutations stay disabled until a billing ledger exists
 */

import {
  COMMISSIONS_READ,
  COMMISSIONS_SETTLE,
  hasPermission,
  PARTNERS_MANAGE,
  PARTNERS_READ,
} from "../permissions/permissions.ts";

export type PartnerProfileSection =
  | "directory"
  | "overview"
  | "performance"
  | "assigned-shgs"
  | "commission"
  | "settlements"
  | "manage";

/** Partner directory and non-financial partner profile sections. */
export function canReadPartners(permissions: readonly string[]): boolean {
  return hasPermission(permissions, PARTNERS_READ) || hasPermission(permissions, PARTNERS_MANAGE);
}

/** Create, edit and deactivate partners. */
export function canManagePartners(permissions: readonly string[]): boolean {
  return hasPermission(permissions, PARTNERS_MANAGE);
}

/**
 * Commission ledger and settlements. Independent of partners.read / partners.manage —
 * holding either partner permission does not grant commissions.read.
 */
export function canReadCommissions(permissions: readonly string[]): boolean {
  return hasPermission(permissions, COMMISSIONS_READ);
}

/**
 * Settlement recording. Vocabulary exists (`console:commissions.settle`) but
 * mutations remain disabled until billing is connected.
 */
export function canSettleCommissions(permissions: readonly string[]): boolean {
  void permissions;
  void COMMISSIONS_SETTLE;
  return false;
}

/** Server-side section gate used by pages and authorization tests. */
export function partnerSectionAllowed(permissions: readonly string[], section: PartnerProfileSection): boolean {
  switch (section) {
    case "directory":
    case "overview":
    case "performance":
    case "assigned-shgs":
      return canReadPartners(permissions);
    case "commission":
    case "settlements":
      return canReadCommissions(permissions);
    case "manage":
      return canManagePartners(permissions);
  }
}
