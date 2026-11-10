/**
 * Whether the console reads SHG data. "connected": SHG pages are served by the
 * console's read-only server routes (/api/shg/*), which require shg:read and
 * read ozey-shg with a short-lived impersonated credential for the
 * workforce-shg-reader identity (datastore.entities.get/list only).
 * Set back to "not-connected" to hide all SHG data without a deploy of rules.
 */
export type ShgDataConnection = "not-connected" | "connected";

export const SHG_DATA_CONNECTION: ShgDataConnection = "connected";
