"use client";

import { Alert, Chip, Label, ListBox, Select } from "@heroui/react";
import { BarChart3, Users } from "lucide-react";
import { DetailList } from "@/components/data/detail-list";
import { Metric, MetricStrip } from "@/components/data/metric";
import { PageHeader } from "@/components/page/page-header";
import { Panel } from "@/components/page/panel";
import { DataErrorAlert } from "@/components/states/data-error";
import { EmptyBlock } from "@/components/states/empty-block";
import { type DataColumn, DataTable } from "@/components/tables/data-table";
import { EMPTY, formatCurrency, formatDate, formatPeriod } from "@/lib/format";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { GroupPicker } from "../components/group-picker";
import { useGroupSearch, useReport } from "../queries";
import type { ClosureStatus, ShgReportMonth, ShgRuleVersion } from "../types";

const CLOSURE_COLOR: Record<ClosureStatus, "success" | "warning" | "default"> = {
  closed: "success",
  reopened: "warning",
  open: "default",
  unknown: "default",
};

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => thisYear - i);

export function ReportsView() {
  const [params, setParams] = useUrlState();
  const firstGroup = useGroupSearch("");
  const groupId = params.get("group") ?? firstGroup.data?.[0]?.id ?? null;
  const yearParam = Number(params.get("year"));
  const year = YEARS.includes(yearParam) ? yearParam : thisYear;
  const report = useReport(groupId, year);
  const r = report.data;

  const columns: DataColumn<ShgReportMonth>[] = [
    { id: "period", label: "Month", isRowHeader: true, render: (m) => formatPeriod(m.period) },
    { id: "savings", label: "Savings", align: "end", render: (m) => formatCurrency(m.savings) },
    { id: "repayments", label: "Loan repayments", align: "end", render: (m) => formatCurrency(m.loanRepayments) },
    { id: "opening", label: "Opening repayments", align: "end", hideOnMobile: true, render: (m) => formatCurrency(m.openingRepayments) },
    { id: "late", label: "Late fees", align: "end", hideOnMobile: true, render: (m) => formatCurrency(m.lateFeesCollected) },
    { id: "disbursed", label: "Loans disbursed", align: "end", hideOnMobile: true, render: (m) => formatCurrency(m.loansDisbursed) },
    { id: "income", label: "Other income", align: "end", hideOnMobile: true, render: (m) => formatCurrency(m.otherIncome) },
    { id: "expenses", label: "Expenses", align: "end", hideOnMobile: true, render: (m) => formatCurrency(m.expenses) },
    {
      id: "closure",
      label: "Month closure",
      render: (m) =>
        m.closure ? (
          <span className="flex items-center gap-2">
            <Chip size="sm" variant="soft" color={CLOSURE_COLOR[m.closure.status]}>
              {m.closure.status === "closed" ? "Closed" : m.closure.status === "reopened" ? "Reopened" : "Open"}
            </Chip>
            <span className="tabular">{formatCurrency(m.closure.closingBalance)}</span>
          </span>
        ) : (
          <span className="text-muted">Not closed</span>
        ),
    },
    {
      id: "rule",
      label: "Monthly savings rule",
      align: "end",
      hideOnMobile: true,
      render: (m) => (m.rules ? formatCurrency(m.rules.monthlySavings) : <span className="text-muted">{EMPTY}</span>),
    },
  ];

  const ruleColumns: DataColumn<ShgRuleVersion>[] = [
    { id: "from", label: "Effective from", isRowHeader: true, render: (v) => formatPeriod(v.effectiveFrom) },
    { id: "rev", label: "Revision", align: "end", render: (v) => v.revision },
    { id: "savings", label: "Monthly savings", align: "end", render: (v) => formatCurrency(v.monthlySavings) },
    { id: "penalty", label: "Late penalty", align: "end", render: (v) => formatCurrency(v.latePenalty) },
    { id: "day", label: "Meeting day", align: "end", hideOnMobile: true, render: (v) => v.meetingDay },
    { id: "grace", label: "Grace days", align: "end", hideOnMobile: true, render: (v) => v.graceDays },
    { id: "updated", label: "Updated", hideOnMobile: true, render: (v) => <span className="text-muted">{formatDate(v.updatedAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        size="section"
        title="Reports"
        description="A group's year, month by month. Cash figures are summed from the group's records; month closures are the SHG app's own snapshots, shown alongside and never mixed in."
      />
      <Panel
        flush
        title={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <GroupPicker value={groupId} onChange={(id) => setParams({ group: id })} />
            <Select
              aria-label="Year"
              className="w-full sm:w-32"
              value={String(year)}
              onChange={(value) => setParams({ year: value === String(thisYear) ? null : String(value) })}
            >
              <Label className="sr-only">Year</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {YEARS.map((y) => (
                    <ListBox.Item key={y} id={String(y)} textValue={String(y)}>
                      {y}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        }
      >
        {!groupId ? (
          firstGroup.isPending ? null : (
            <EmptyBlock icon={Users} title="No groups yet" description="Reports appear once a group exists in the SHG app." />
          )
        ) : report.error ? (
          <div className="p-4">
            <DataErrorAlert error={report.error} onRetry={() => report.refetch()} />
          </div>
        ) : (
          <>
            {r?.truncated ? (
              <div className="p-4 pb-0">
                <Alert status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>This year has more records than the report reads at once, so some totals are partial.</Alert.Description>
                  </Alert.Content>
                </Alert>
              </div>
            ) : null}
            <DataTable
              label={`Report ${year}`}
              columns={columns}
              items={r?.months ?? []}
              getKey={(m) => m.period}
              isPending={report.isPending}
              error={null}
              empty={{ icon: BarChart3, title: "No months" }}
              minWidth={1180}
            />
          </>
        )}
      </Panel>

      {groupId && r ? (
        <>
          <div className="mt-6">
            <MetricStrip>
              <Metric label={`Savings ${year}`} value={formatCurrency(r.totals.savings)} hint="Net of reversals" isPending={false} error={null} />
              <Metric
                label="Loan repayments"
                value={formatCurrency(r.totals.loanRepayments + r.totals.openingRepayments)}
                hint={`incl. ${formatCurrency(r.totals.openingRepayments)} against opening balances`}
                isPending={false}
                error={null}
              />
              <Metric label="Late fees collected" value={formatCurrency(r.totals.lateFeesCollected)} isPending={false} error={null} />
              <Metric label="Loans disbursed" value={formatCurrency(r.totals.loansDisbursed)} isPending={false} error={null} />
            </MetricStrip>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel className="lg:col-span-2" title="Rule history" description="The group's effective-dated rules, oldest first" flush>
              <DataTable
                label="Rule history"
                columns={ruleColumns}
                items={r.ruleVersions}
                getKey={(v) => v.id}
                isPending={false}
                error={null}
                empty={{ icon: BarChart3, title: "No rule versions recorded" }}
                minWidth={640}
              />
            </Panel>
            <Panel title="Opening balance" description="Carried in before the group used the app">
              {r.openingBalance ? (
                <DetailList
                  columns={2}
                  items={[
                    { label: "Savings", value: formatCurrency(r.openingBalance.totalSavings) },
                    { label: "Outstanding loans", value: formatCurrency(r.openingBalance.outstandingLoans) },
                    { label: "Loans given", value: formatCurrency(r.openingBalance.totalLoansGiven) },
                    { label: "Interest collected", value: formatCurrency(r.openingBalance.totalInterestCollected) },
                    { label: "Late fees collected", value: formatCurrency(r.openingBalance.totalLateFeesCollected) },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted">No opening balance was entered for this group.</p>
              )}
            </Panel>
          </div>
        </>
      ) : null}
    </>
  );
}
