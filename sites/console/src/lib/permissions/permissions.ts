/**
 * Product-scoped permissions: `<product>:<capability>`, e.g. `shg:read`.
 * Each product defines its own vocabulary and enforces it in its own backend.
 * There is no wildcard and no global staff flag.
 * See OZEY_WORKFORCE_ARCHITECTURE.md §6.
 */
export type Permission = `${string}:${string}`;

export function hasPermission(permissions: readonly string[], permission: Permission): boolean {
  return permissions.includes(permission);
}

/** Create and manage Ozey Console employees (the console-admin role). */
export const EMPLOYEES_MANAGE: Permission = "console:employees.manage";

/** Create, edit and deactivate external partners (Digital Sakhi / Digital Sarathi). */
export const PARTNERS_MANAGE: Permission = "console:partners.manage";

/** Read the Partners directory and partner profiles. */
export const PARTNERS_READ: Permission = "console:partners.read";

/** Read partner performance, assigned SHGs, commission ledger and settlements. */
export const COMMISSIONS_READ: Permission = "console:commissions.read";

/**
 * Record commission settlements. Vocabulary only in this phase — settlement
 * mutation APIs are not implemented until a billing-backed ledger exists.
 */
export const COMMISSIONS_SETTLE: Permission = "console:commissions.settle";
