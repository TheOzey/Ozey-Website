import type { NavTab } from "@/components/navigation/nav-tabs";

/** Partner directory and create routes. */
export const PARTNERS_LIST = "/partners";
export const PARTNERS_NEW = "/partners/new";

/** Partner profile routes under /partners/[partnerNumber]. */
export function partnerRoutes(partnerNumber: string) {
  const base = `/partners/${encodeURIComponent(partnerNumber)}`;
  return {
    overview: base,
    performance: `${base}/performance`,
    assignedShgs: `${base}/assigned-shgs`,
    commission: `${base}/commission`,
    settlements: `${base}/settlements`,
    edit: `${base}/edit`,
  };
}

const PROFILE_SECTIONS = [
  { label: "Overview", key: "overview" as const },
  { label: "Performance", key: "performance" as const },
  { label: "Assigned SHGs", key: "assignedShgs" as const },
  { label: "Commission", key: "commission" as const },
  { label: "Settlements", key: "settlements" as const },
] as const;

export function partnerProfileTabs(
  partnerNumber: string,
  options: { includeCommissions?: boolean } = {},
): NavTab[] {
  const routes = partnerRoutes(partnerNumber);
  const includeCommissions = options.includeCommissions !== false;
  return PROFILE_SECTIONS.filter((section) => {
    if (section.key === "commission" || section.key === "settlements") return includeCommissions;
    return true;
  }).map((section) => ({
    label: section.label,
    href: routes[section.key],
    exact: section.key === "overview",
  }));
}
