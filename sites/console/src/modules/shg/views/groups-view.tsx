"use client";

import { Label, SearchField } from "@heroui/react";
import { UsersRound } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/page/panel";
import { PageHeader } from "@/components/page/page-header";
import { type DataColumn, DataTable } from "@/components/tables/data-table";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { shgRoutes } from "../navigation";
import { useGroupsPage } from "../queries";
import { LoanAmount } from "../components/labels";
import type { GroupFinancials, ShgGroup } from "../types";

type GroupRow = ShgGroup & { financials: GroupFinancials };

const columns: DataColumn<GroupRow>[] = [
  {
    id: "name",
    label: "Group",
    isRowHeader: true,
    render: (g) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-foreground">{g.name}</div>
        <div className="truncate text-xs text-muted">{g.village || "No village recorded"}</div>
      </div>
    ),
  },
  // Per-row figures are built server-side from the group's records (GroupFinancials),
  // with the same definitions as the Overview KPIs.
  { id: "members", label: "Active members", align: "end", render: (g) => formatNumber(g.financials.members.active) },
  { id: "savings", label: "Total savings", align: "end", render: (g) => formatCurrency(g.financials.savings.total) },
  { id: "loans", label: "Total loans recorded", align: "end", render: (g) => formatCurrency(g.financials.loans.totalRecorded) },
  {
    id: "outstanding",
    label: "Outstanding loans",
    align: "end",
    render: (g) => (
      <span>
        {formatCurrency(g.financials.loans.outstandingPrincipal)}
        {g.financials.loans.unknownFlexibleLoans ? (
          <span className="block text-xs text-muted">
            + {g.financials.loans.unknownFlexibleLoans} flexible <LoanAmount value={null} />
          </span>
        ) : null}
      </span>
    ),
  },
  { id: "monthly", label: "Monthly savings", align: "end", hideOnMobile: true, render: (g) => formatCurrency(g.monthlySavings) },
  { id: "interest", label: "Loan interest", align: "end", hideOnMobile: true, render: (g) => formatPercent(g.loanInterestMonthlyPct, " / mo") },
  { id: "formed", label: "Formed", hideOnMobile: true, render: (g) => <span className="text-muted">{formatDate(g.formationDate)}</span> },
];

export function GroupsView() {
  const [params, setParams] = useUrlState();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const debounced = useDebouncedValue(search.trim());
  const page = useGroupsPage(debounced);

  return (
    <>
      <PageHeader
        size="section"
        title="Groups"
        description="Every Self Help Group in the SHG app, ordered by name. Savings and loans include each group's opening balance; outstanding is principal still owed."
      />
      <Panel
        flush
        title={
          <SearchField
            aria-label="Search groups"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setParams({ q: value.trim() || null });
            }}
          >
            <Label className="sr-only">Search groups</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input className="w-full sm:w-72" placeholder="Search by group name" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        }
        actions={<span className="text-xs text-muted">Matches the start of the name · case-sensitive</span>}
      >
        <DataTable
          label="Groups"
          columns={columns}
          items={page.items}
          getKey={(g) => g.id}
          getHref={(g) => shgRoutes.group(g.id)}
          isPending={page.query.isPending}
          isFetching={page.query.isFetching}
          error={page.query.error}
          onRetry={() => page.query.refetch()}
          empty={{ icon: UsersRound, title: "No groups yet", description: "Groups created in the SHG app will appear here." }}
          isFiltered={Boolean(debounced)}
          pager={page}
          minWidth={980}
        />
      </Panel>
    </>
  );
}
