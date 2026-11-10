"use client";

import { Link } from "@heroui/react";
import { PiggyBank } from "lucide-react";
import { Metric, MetricStrip } from "@/components/data/metric";
import { PageHeader } from "@/components/page/page-header";
import { Panel } from "@/components/page/panel";
import { type DataColumn, DataTable } from "@/components/tables/data-table";
import { formatCurrency, formatNumber } from "@/lib/format";
import { shgRoutes } from "../navigation";
import { useShgOverview } from "../queries";
import type { ShgOverview } from "../types";

type TopGroup = ShgOverview["topGroupsBySavings"][number];

const added = (n: number | undefined, what: string) => (n === undefined ? undefined : `+${formatNumber(n)} ${what} in the last 30 days`);

/**
 * Aggregates across every group, built on the server from the underlying
 * records with the SHG app's own definitions (see GroupFinancials).
 */
export function ShgOverview() {
  const overview = useShgOverview();
  const o = overview.data;
  const loading = { isPending: overview.isPending, error: overview.error };

  const columns: DataColumn<TopGroup & { rank: number }>[] = [
    { id: "rank", label: "#", render: (g) => <span className="text-muted tabular">{g.rank}</span> },
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
    { id: "opening", label: "Opening savings", align: "end", hideOnMobile: true, render: (g) => <span className="text-muted">{formatCurrency(g.openingSavings)}</span> },
    { id: "recorded", label: "Recorded in app", align: "end", hideOnMobile: true, render: (g) => <span className="text-muted">{formatCurrency(g.recordedSavings)}</span> },
    { id: "savings", label: "Total savings", align: "end", render: (g) => <span className="font-medium">{formatCurrency(g.savings)}</span> },
  ];

  return (
    <>
      <PageHeader size="section" title="Overview" description="Totals across every group, from the SHG production records." />

      <MetricStrip>
        <Metric label="Total groups" value={formatNumber(o?.groups)} hint={added(o?.groupsAddedLast30Days, "added")} {...loading} />
        <Metric
          label="Total members"
          value={formatNumber(o?.members.active)}
          hint={added(o?.members.activeAddedLast30Days, "joined")}
          {...loading}
        />
        <Metric
          label="Total savings recorded"
          value={formatCurrency(o?.savings.total)}
          hint={o ? `${formatCurrency(o.savings.recordedLast30Days)} recorded in the last 30 days` : undefined}
          {...loading}
        />
        <Metric
          label="Total loans recorded"
          value={formatCurrency(o?.loans.totalRecorded)}
          hint={o ? `${formatCurrency(o.loans.outstandingPrincipal)} outstanding${o.loans.unknownFlexibleLoans ? ` · excludes ${o.loans.unknownFlexibleLoans} flexible` : ""}` : undefined}
          {...loading}
        />
      </MetricStrip>
      {o ? (
        <p className="mt-3 text-xs text-muted">
          Savings = opening balance ({formatCurrency(o.savings.opening)}) + savings recorded in the app ({formatCurrency(o.savings.recorded)}).
          Loans = loans given before the app ({formatCurrency(o.loans.openingGiven)}) + loans given in the app (
          {formatCurrency(o.loans.recordedPrincipal)}). Outstanding is principal still owed.
        </p>
      ) : null}

      <Panel
        className="mt-8"
        flush
        title="Top 10 groups by savings"
        description="Opening balance plus savings recorded in the app"
        actions={
          <Link href={shgRoutes.groups} className="text-sm">
            View all
            <Link.Icon />
          </Link>
        }
      >
        <DataTable
          label="Top groups by savings"
          columns={columns}
          items={(o?.topGroupsBySavings ?? []).map((g, i) => ({ ...g, rank: i + 1 }))}
          getKey={(g) => g.id}
          getHref={(g) => shgRoutes.group(g.id)}
          isPending={overview.isPending}
          error={overview.error}
          onRetry={() => overview.refetch()}
          empty={{ icon: PiggyBank, title: "No groups yet", description: "Groups created in the SHG app will appear here." }}
          minWidth={560}
        />
      </Panel>
    </>
  );
}
