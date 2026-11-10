"use client";

import { Label, Link, ListBox, Select } from "@heroui/react";
import { HandCoins } from "lucide-react";
import { Panel } from "@/components/page/panel";
import { type DataColumn, DataTable } from "@/components/tables/data-table";
import { EMPTY, formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { LoanAmount, LoanStatusChip, loanTermsLabel, OPENING_LOAN_NOTE } from "../components/labels";
import { shgRoutes } from "../navigation";
import { useLoansPage } from "../queries";
import type { LoanStatusFilter } from "../services";
import type { ShgLoan } from "../types";
import { SectionIntro } from "./group-shell";

const STATUSES: { id: LoanStatusFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "overdue", label: "Overdue" },
  { id: "repaid", label: "Repaid" },
  { id: "pending", label: "Pending" },
];

/** One group's loans. The group comes from the route, never from a filter. */
export function GroupLoansView({ groupId }: { groupId: string }) {
  const [params, setParams] = useUrlState();
  const statusParam = params.get("status");
  const status = STATUSES.some((s) => s.id === statusParam) ? (statusParam as LoanStatusFilter) : null;
  const page = useLoansPage(groupId, status);

  const columns: DataColumn<ShgLoan>[] = [
    {
      id: "borrower",
      label: "Borrower",
      isRowHeader: true,
      render: (l) => (
        <Link href={shgRoutes.member(l.groupId, l.memberId)} className="font-medium text-foreground no-underline hover:underline">
          {l.memberName}
        </Link>
      ),
    },
    {
      id: "source",
      label: "Source",
      render: (l) => (
        <span className="text-muted" title={l.source === "opening" ? OPENING_LOAN_NOTE : undefined}>
          {l.source === "opening" ? "Before the app" : "In app"}
        </span>
      ),
    },
    { id: "principal", label: "Loan amount", align: "end", render: (l) => formatCurrency(l.principal) },
    {
      id: "date",
      label: "Date",
      hideOnMobile: true,
      render: (l) => <span className="text-muted">{l.source === "opening" ? `As of ${formatDate(l.disbursedAt)}` : formatDate(l.disbursedAt)}</span>,
    },
    { id: "terms", label: "Terms", hideOnMobile: true, render: (l) => <span className="text-muted">{loanTermsLabel(l)}</span> },
    {
      id: "interest",
      label: "Interest",
      align: "end",
      hideOnMobile: true,
      render: (l) => (l.source === "opening" ? <span className="text-muted">{EMPTY}</span> : formatPercent(l.interestMonthlyPct, " / mo")),
    },
    {
      id: "totalInterest",
      label: "Total interest",
      align: "end",
      hideOnMobile: true,
      render: (l) => (l.source === "opening" ? <span className="text-muted">Monthly</span> : <LoanAmount value={l.totalInterest} />),
    },
    { id: "repaid", label: "Repaid", align: "end", render: (l) => formatCurrency(l.amountRepaid) },
    {
      id: "principalOutstanding",
      label: "Principal outstanding",
      align: "end",
      render: (l) => (
        <span className="font-medium">
          <LoanAmount value={l.principalOutstanding} />
        </span>
      ),
    },
    {
      id: "outstanding",
      label: "Balance due",
      align: "end",
      hideOnMobile: true,
      render: (l) => (l.source === "opening" ? <span className="text-muted">{EMPTY}</span> : <LoanAmount value={l.outstanding} />),
    },
    { id: "status", label: "Status", render: (l) => <LoanStatusChip status={l.status} /> },
  ];

  return (
    <>
      <SectionIntro>
        Every loan of this group: loans given before the app (from the opening balance, one row per member) and loans given
        in the app. In-app interest follows the app&apos;s rules: flat (principal × rate × months) or reducing balance
        (principal × rate × (months + 1) ÷ 2). Principal outstanding uses the app&apos;s interest-first repayment waterfall;
        balance due adds the remaining contractual interest. Flexible loans accrue interest only on members&apos; devices,
        so once repaid in part their figures are not available from cloud data. Opening-loan interest is charged monthly,
        not as a fixed total.
      </SectionIntro>
      <Panel
        flush
        title={
          <Select
              aria-label="Loan status"
              className="w-full sm:w-44"
              value={status ?? "all"}
              onChange={(value) => setParams({ status: value === "all" ? null : String(value) })}
            >
              <Label className="sr-only">Status</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue="All statuses">
                    All statuses
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {STATUSES.map((s) => (
                    <ListBox.Item key={s.id} id={s.id} textValue={s.label}>
                      {s.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
          </Select>
        }
      >
        <DataTable
          label="Group loans"
          columns={columns}
          items={page.items}
          getKey={(l) => `${l.groupId}:${l.id}`}
          isPending={page.query.isPending}
          isFetching={page.query.isFetching}
          error={page.query.error}
          onRetry={() => page.query.refetch()}
          empty={{ icon: HandCoins, title: "No loans recorded for this group" }}
          isFiltered={Boolean(status)}
          pager={page}
          minWidth={1100}
        />
      </Panel>
    </>
  );
}
