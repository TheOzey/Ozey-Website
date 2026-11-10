"use client";

import { Label, SearchField } from "@heroui/react";
import { UserRound } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/page/panel";
import { type DataColumn, DataTable } from "@/components/tables/data-table";
import { formatCurrency, formatDate, maskPhone } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { AdminChip, MemberStatusChip, ROLE_LABEL } from "../components/labels";
import { shgRoutes } from "../navigation";
import { useMembersPage } from "../queries";
import type { ShgMember } from "../types";
import { SectionIntro } from "./group-shell";

/** One group's members. The group comes from the route, never from a filter. */
export function GroupMembersView({ groupId }: { groupId: string }) {
  const [params, setParams] = useUrlState();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const debounced = useDebouncedValue(search.trim());
  const page = useMembersPage(groupId, debounced);

  const columns: DataColumn<ShgMember>[] = [
    {
      id: "name",
      label: "Member",
      isRowHeader: true,
      render: (m) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-foreground">{m.name}</span>
          {m.isAdmin ? <AdminChip /> : null}
        </span>
      ),
    },
    { id: "role", label: "Role", hideOnMobile: true, render: (m) => <span className="text-muted">{ROLE_LABEL[m.role]}</span> },
    { id: "status", label: "Status", render: (m) => <MemberStatusChip status={m.status} /> },
    { id: "phone", label: "Phone", hideOnMobile: true, render: (m) => <span className="text-muted tabular">{maskPhone(m.phone)}</span> },
    { id: "savings", label: "Savings", align: "end", render: (m) => formatCurrency(m.cachedTotalSavings) },
    { id: "joined", label: "Joined", hideOnMobile: true, render: (m) => <span className="text-muted">{formatDate(m.joinedAt)}</span> },
  ];

  return (
    <>
      <SectionIntro>Members of this group, ordered by name. Savings is the app&apos;s cached member total.</SectionIntro>
      <Panel
        flush
        title={
          <SearchField
              aria-label="Search members"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setParams({ q: value.trim() || null });
              }}
            >
              <Label className="sr-only">Search members</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input className="w-full sm:w-64" placeholder="Search by name" />
                <SearchField.ClearButton />
              </SearchField.Group>
          </SearchField>
        }
        actions={<span className="text-xs text-muted">Name search matches the start · case-sensitive</span>}
      >
        <DataTable
          label="Group members"
          columns={columns}
          items={page.items}
          getKey={(m) => `${m.groupId}:${m.id}`}
          getHref={(m) => shgRoutes.member(m.groupId, m.id)}
          isPending={page.query.isPending}
          isFetching={page.query.isFetching}
          error={page.query.error}
          onRetry={() => page.query.refetch()}
          empty={{ icon: UserRound, title: "No members in this group" }}
          isFiltered={Boolean(debounced)}
          pager={page}
        />
      </Panel>
    </>
  );
}
