"use client";

import { MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { NavTabs } from "@/components/navigation/nav-tabs";
import { PageContainer } from "@/components/page/page-container";
import type { Crumb } from "@/components/page/page-header";
import { ContextHeader } from "@/components/shell/context-header";
import { DataErrorAlert } from "@/components/states/data-error";
import { formatDate } from "@/lib/format";
import { GROUP_SECTIONS, shgRoutes } from "../navigation";
import { useGroup } from "../queries";

/**
 * Breadcrumbs down to a group: SHG / Groups / <group>. Pages below the group's
 * own sections (a member) pass a trail, which turns the group into a link.
 */
export function groupCrumbs(groupId: string, groupName: string | undefined, trail: Crumb[] = []): Crumb[] {
  const name = groupName ?? "Group";
  return [
    { label: "SHG", href: shgRoutes.overview },
    { label: "Groups", href: shgRoutes.groups },
    trail.length ? { label: name, href: shgRoutes.group(groupId) } : { label: name },
    ...trail,
  ];
}

/**
 * The frame shared by every page of one group, in place of the SHG product
 * header: the group's identity (name, village, formed date), which scrolls
 * away, and the group tabs (Overview | Members | Transactions | Loans |
 * Meetings), which stay stuck under the main header. The main header's back
 * button returns to Groups. The group comes from the URL, so a refresh or a
 * direct link keeps the context.
 */
export function GroupShell({ groupId, children }: { groupId: string; children: ReactNode }) {
  const group = useGroup(groupId);
  const g = group.data;
  const tabs = [
    { label: "Overview", href: shgRoutes.group(groupId), exact: true },
    ...GROUP_SECTIONS.map((s) => ({ label: s.label, href: shgRoutes.groupSection(groupId, s.id) })),
  ];

  return (
    <>
      <ContextHeader
        identity={
          <div className="min-w-0">
            <h1 className="truncate text-2xl leading-tight font-semibold tracking-[-0.025em] text-foreground">
              {group.error ? "Group" : (g?.name ?? "Loading…")}
            </h1>
            <p className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-1.5 text-sm text-muted">
              {g ? (
                <>
                  {g.village ? (
                    <>
                      <MapPin className="size-3.5" aria-hidden />
                      <span>{g.village}</span>
                      <span aria-hidden>·</span>
                    </>
                  ) : null}
                  <span>Formed {formatDate(g.formationDate)}</span>
                </>
              ) : null}
            </p>
          </div>
        }
        navigation={group.error ? undefined : <NavTabs level="section" divider={false} label="Group sections" tabs={tabs} />}
        compactTitle={g?.name}
      />
      <PageContainer>
        {group.error ? <DataErrorAlert error={group.error} onRetry={() => group.refetch()} /> : children}
      </PageContainer>
    </>
  );
}

/** One-line explanation above a group section's table. */
export function SectionIntro({ children }: { children: ReactNode }) {
  return <p className="mb-4 max-w-3xl text-sm text-muted">{children}</p>;
}
