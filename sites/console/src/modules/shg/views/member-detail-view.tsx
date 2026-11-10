"use client";

import { Link } from "@heroui/react";
import { ArrowLeftRight, HandCoins } from "lucide-react";
import { useState } from "react";
import { DetailList } from "@/components/data/detail-list";
import { Metric, MetricStrip } from "@/components/data/metric";
import { PageHeader } from "@/components/page/page-header";
import { Panel } from "@/components/page/panel";
import { DataErrorAlert } from "@/components/states/data-error";
import { BlockSkeleton } from "@/components/states/skeletons";
import { type DataColumn, DataTable } from "@/components/tables/data-table";
import { EMPTY, formatCurrency, formatDate, formatNumber, formatPercent, formatPeriod, maskPhone } from "@/lib/format";
import { TransactionAmount } from "../components/amount";
import { AdminChip, LoanAmount, LoanStatusChip, loanTermsLabel, MemberStatusChip, ROLE_LABEL, transactionLabel } from "../components/labels";
import { shgRoutes } from "../navigation";
import { useGroup, useMember, useMemberAccount, useMemberHistory, useMemberLoans } from "../queries";
import type { ShgLoan, ShgTransaction } from "../types";
import { groupCrumbs } from "./group-shell";

const HISTORY_PAGE = 25;

const loanColumns: DataColumn<ShgLoan>[] = [
  {
    id: "date",
    label: "Date",
    isRowHeader: true,
    render: (l) => (l.source === "opening" ? `Before the app` : formatDate(l.disbursedAt)),
  },
  { id: "principal", label: "Loan amount", align: "end", render: (l) => formatCurrency(l.principal) },
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
  { id: "principalOutstanding", label: "Principal outstanding", align: "end", render: (l) => <LoanAmount value={l.principalOutstanding} /> },
  { id: "status", label: "Status", render: (l) => <LoanStatusChip status={l.status} /> },
];

const historyColumns: DataColumn<ShgTransaction>[] = [
  { id: "date", label: "Date", isRowHeader: true, render: (t) => <span className="tabular">{formatDate(t.date)}</span> },
  {
    id: "type",
    label: "Type",
    render: (t) => (
      <span className="text-muted">
        {transactionLabel(t)}
        {t.isReversal ? " (reversal)" : ""}
        {t.kind === "monthly-charge" && t.appliesToPeriod ? ` · for ${formatPeriod(t.appliesToPeriod)}` : ""}
      </span>
    ),
  },
  { id: "period", label: "Period", hideOnMobile: true, render: (t) => <span className="text-muted">{formatPeriod(t.period)}</span> },
  { id: "notes", label: "Notes", hideOnMobile: true, render: (t) => <span className="text-muted">{t.notes ?? EMPTY}</span> },
  {
    id: "amount",
    label: "Amount",
    align: "end",
    render: (t) => (t.kind === "opening-balance" || t.kind === "disbursement" ? formatCurrency(t.amount) : <TransactionAmount tx={t} />),
  },
];

export function MemberDetailView({ groupId, memberId }: { groupId: string; memberId: string }) {
  const member = useMember(groupId, memberId);
  const account = useMemberAccount(groupId, memberId);
  const group = useGroup(groupId);
  const loans = useMemberLoans(groupId, memberId);
  const history = useMemberHistory(groupId, memberId);
  const [historyPage, setHistoryPage] = useState(0);

  const crumbs = groupCrumbs(groupId, group.data?.name, [
    { label: "Members", href: shgRoutes.groupSection(groupId, "members") },
    { label: member.data?.name ?? "Member" },
  ]);

  if (member.error) {
    return (
      <>
        <PageHeader size="section" title="Member" breadcrumbs={crumbs} />
        <DataErrorAlert error={member.error} onRetry={() => member.refetch()} />
      </>
    );
  }

  const m = member.data;
  const a = account.data;
  const items = history.data?.items ?? [];
  const pageItems = items.slice(historyPage * HISTORY_PAGE, (historyPage + 1) * HISTORY_PAGE);
  const loading = { isPending: account.isPending, error: account.error };
  const savingsMismatch = a && a.savings.entries > 0 && Math.abs(a.savings.recorded - a.savings.recordedFromEntries) >= 0.01;

  return (
    <>
      <PageHeader
        size="section"
        title={m?.name ?? "Loading…"}
        breadcrumbs={crumbs}
        meta={
          m ? (
            <>
              <MemberStatusChip status={m.status} />
              {m.isAdmin ? <AdminChip /> : null}
              <span className="text-xs text-muted">
                {ROLE_LABEL[m.role]} ·{" "}
                <Link href={shgRoutes.group(groupId)} className="text-xs">
                  {group.data?.name ?? "Group"}
                </Link>
              </span>
            </>
          ) : null
        }
      />

      <MetricStrip>
        <Metric
          label="Total savings"
          value={formatCurrency(a?.savings.total)}
          hint={a ? `${formatCurrency(a.savings.opening)} opening + ${formatCurrency(a.savings.recorded)} recorded` : undefined}
          {...loading}
        />
        <Metric
          label="Loans taken"
          value={formatCurrency(a?.loans.totalTaken)}
          hint={a ? `${formatCurrency(a.loans.openingTaken)} before the app + ${formatCurrency(a.loans.recordedPrincipal)} in the app` : undefined}
          {...loading}
        />
        <Metric
          label="Loan outstanding"
          value={formatCurrency(a?.loans.outstandingPrincipal)}
          hint={
            a
              ? `Principal still owed${a.loans.unknownFlexibleLoans ? ` · excludes ${a.loans.unknownFlexibleLoans} flexible (not in cloud data)` : ""}`
              : undefined
          }
          {...loading}
        />
        <Metric
          label="Interest paid to group"
          value={formatCurrency(a?.interest.total)}
          hint={a ? `${formatCurrency(a.interest.openingPaidBeforeApp)} before the app + ${formatCurrency(a.interest.openingCollected)} since` : undefined}
          {...loading}
        />
      </MetricStrip>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Savings" description="Opening balance plus savings recorded in the app">
          {account.error ? (
            <DataErrorAlert error={account.error} onRetry={() => account.refetch()} />
          ) : !a ? (
            <BlockSkeleton lines={2} />
          ) : (
            <>
              <DetailList
                items={[
                  { label: "Opening savings", value: formatCurrency(a.savings.opening) },
                  { label: "Recorded in the app", value: formatCurrency(a.savings.recorded) },
                  { label: "Total savings", value: <span className="font-semibold">{formatCurrency(a.savings.total)}</span> },
                  { label: "Monthly target", value: formatCurrency(m?.monthlyTarget) },
                  { label: `Savings entries (${formatNumber(a.savings.entries)})`, value: formatCurrency(a.savings.recordedFromEntries) },
                ]}
              />
              {savingsMismatch ? (
                <p className="mt-4 text-xs text-warning">
                  The app&apos;s recorded figure for this member differs from the sum of their savings entries. The app excludes
                  some legacy advance entries; the console shows the app&apos;s figure.
                </p>
              ) : null}
            </>
          )}
        </Panel>

        <Panel title="Loans" description="Before the app (opening balance) and given in the app">
          {!a ? (
            account.error ? null : <BlockSkeleton lines={3} />
          ) : (
            <DetailList
              items={[
                { label: "Taken before the app", value: formatCurrency(a.loans.openingTaken) },
                { label: "Opening balance owed", value: formatCurrency(a.loans.openingOutstandingAtStart) },
                { label: "Repaid against opening loan", value: formatCurrency(a.loans.openingCollected) },
                { label: "Opening loan outstanding", value: formatCurrency(a.loans.openingOutstanding) },
                { label: "Given in the app", value: formatCurrency(a.loans.recordedPrincipal) },
                { label: "Repaid on in-app loans", value: formatCurrency(a.loans.recordedRepaid) },
                { label: "In-app principal outstanding", value: formatCurrency(a.loans.recordedOutstanding) },
              ]}
            />
          )}
        </Panel>

        <Panel title="Fines and charges" description="Opening late fees and monthly late fines">
          {!a ? (
            account.error ? null : <BlockSkeleton lines={2} />
          ) : (
            <DetailList
              items={[
                { label: "Opening late fee due", value: formatCurrency(a.fines.openingDue) },
                { label: "Opening late fees paid", value: formatCurrency(a.fines.openingPaid) },
                { label: "Monthly late fines paid", value: formatCurrency(a.fines.monthlyLateFinesPaid) },
              ]}
            />
          )}
        </Panel>

        <Panel title="Profile and meetings">
          {member.isPending || !m || !a ? (
            <BlockSkeleton lines={2} />
          ) : (
            <DetailList
              items={[
                { label: "Phone", value: maskPhone(m.phone) },
                { label: "Joined", value: formatDate(m.joinedAt) },
                { label: "Left", value: formatDate(m.leftAt) },
                {
                  label: "Meetings attended",
                  value: a.meetings.recorded ? `${formatNumber(a.meetings.attended)} of ${formatNumber(a.meetings.recorded)}` : "No meetings recorded yet",
                },
              ]}
            />
          )}
        </Panel>
      </div>

      <Panel className="mt-6" title="Loans" description="Every loan, before and in the app" flush>
        <DataTable
          label="Member loans"
          columns={loanColumns}
          items={loans.data ?? []}
          getKey={(l) => l.id}
          isPending={loans.isPending}
          error={loans.error}
          onRetry={() => loans.refetch()}
          empty={{ icon: HandCoins, title: "No loans for this member" }}
          minWidth={820}
        />
      </Panel>

      <Panel
        className="mt-6"
        title="Financial history"
        description={
          a?.openingAsOf
            ? `Every record for this member, newest first. Opening balance entries are dated ${formatDate(a.openingAsOf)}, when they were captured.`
            : "Every record for this member, newest first"
        }
        flush
      >
        <DataTable
          label="Member financial history"
          columns={historyColumns}
          items={pageItems}
          getKey={(t) => t.key}
          isPending={history.isPending}
          error={history.error}
          onRetry={() => history.refetch()}
          empty={{ icon: ArrowLeftRight, title: "No financial records for this member" }}
          pager={{
            pageNumber: historyPage + 1,
            hasPrevious: historyPage > 0,
            hasNext: (historyPage + 1) * HISTORY_PAGE < items.length,
            goPrevious: () => setHistoryPage((p) => p - 1),
            goNext: () => setHistoryPage((p) => p + 1),
          }}
          minWidth={640}
        />
      </Panel>
      {history.data?.truncated ? <p className="mt-3 text-xs text-warning">Only the latest 1,000 records of each type are shown.</p> : null}
    </>
  );
}
