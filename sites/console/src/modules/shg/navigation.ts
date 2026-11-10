import type { ProductNavItem } from "@/products/types";

/** Product-level SHG sections, shown as tabs in the SHG header. */
export const shgNavigation: ProductNavItem[] = [
  { label: "Overview", href: "/shg", exact: true },
  { label: "Groups", href: "/shg/groups" },
  { label: "Reports", href: "/shg/reports" },
];

/** Every SHG route, so links are built in one place. Ids are path-encoded. */
export const shgRoutes = {
  overview: "/shg",
  groups: "/shg/groups",
  reports: "/shg/reports",
  group: (groupId: string) => `/shg/groups/${encodeURIComponent(groupId)}`,
  groupSection: (groupId: string, section: GroupSection) => `${shgRoutes.group(groupId)}/${section}`,
  member: (groupId: string, memberId: string) => `${shgRoutes.groupSection(groupId, "members")}/${encodeURIComponent(memberId)}`,
};

/** Group-scoped sections, shown as tabs (after Overview) on a group's pages. */
export const GROUP_SECTIONS = [
  { id: "members", label: "Members" },
  { id: "transactions", label: "Transactions" },
  { id: "loans", label: "Loans" },
  { id: "meetings", label: "Meetings" },
] as const;

export type GroupSection = (typeof GROUP_SECTIONS)[number]["id"];

const GROUP_CONTEXT = /^\/shg\/groups\/[^/]+(\/(members|transactions|loans|meetings))?\/?$/;

/**
 * Pages framed by a group's own header (its Overview and section tabs) rather
 * than the SHG product header. A member page is not one of them.
 */
export function isGroupContextPath(pathname: string): boolean {
  return GROUP_CONTEXT.test(pathname);
}
