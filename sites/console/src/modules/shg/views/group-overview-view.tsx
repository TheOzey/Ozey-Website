"use client";

import { DetailList } from "@/components/data/detail-list";
import { Metric, MetricStrip } from "@/components/data/metric";
import { Panel } from "@/components/page/panel";
import { DataErrorAlert } from "@/components/states/data-error";
import { BlockSkeleton } from "@/components/states/skeletons";
import { EMPTY, formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/format";
import { useGroup, useGroupFinancials, useGroupOpeningBalance } from "../queries";

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

/**
 * A group's Overview tab. Every figure is GroupFinancials, built on the server
 * from the group's records with the SHG app's formulas: savings = opening
 * balance + savings recorded in the app; loans = given before the app + given
 * in the app; outstanding = principal still owed on both.
 */
export function GroupOverviewView({ groupId }: { groupId: string }) {
  const group = useGroup(groupId);
  const financials = useGroupFinancials(groupId);
  const opening = useGroupOpeningBalance(groupId);
  const g = group.data;
  const f = financials.data;
  const loading = { isPending: financials.isPending, error: financials.error };

  return (
    <>
      <MetricStrip>
        <Metric
          label="Active members"
          value={formatNumber(f?.members.active)}
          hint={f ? `+${formatNumber(f.members.activeAddedLast30Days)} joined in the last 30 days` : undefined}
          {...loading}
        />
        <Metric
          label="Total savings"
          value={formatCurrency(f?.savings.total)}
          hint={f ? `${formatCurrency(f.savings.opening)} opening + ${formatCurrency(f.savings.recorded)} recorded` : undefined}
          {...loading}
        />
        <Metric
          label="Total loans recorded"
          value={formatCurrency(f?.loans.totalRecorded)}
          hint={f ? `${formatCurrency(f.loans.openingGiven)} before the app + ${formatCurrency(f.loans.recordedPrincipal)} in the app` : undefined}
          {...loading}
        />
        <Metric
          label="Outstanding loans"
          value={formatCurrency(f?.loans.outstandingPrincipal)}
          hint={
            f
              ? `Principal still owed${f.loans.unknownFlexibleLoans ? ` · excludes ${f.loans.unknownFlexibleLoans} flexible (not in cloud data)` : ""}`
              : undefined
          }
          {...loading}
        />
      </MetricStrip>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Savings" description="Opening balance plus savings recorded in the app">
          {financials.error ? (
            <DataErrorAlert error={financials.error} onRetry={() => financials.refetch()} />
          ) : !f ? (
            <BlockSkeleton lines={2} />
          ) : (
            <DetailList
              items={[
                { label: "Opening savings", value: formatCurrency(f.savings.opening) },
                { label: "Recorded in the app", value: formatCurrency(f.savings.recorded) },
                { label: "Total savings", value: <span className="font-semibold">{formatCurrency(f.savings.total)}</span> },
                { label: "Recorded in the last 30 days", value: formatCurrency(f.savings.recordedLast30Days) },
                ...(f.savings.advance ? [{ label: "Advance (next month, not yet counted)", value: formatCurrency(f.savings.advance) }] : []),
              ]}
            />
          )}
        </Panel>

        <Panel title="Loans" description="Before the app (opening balance) and given in the app">
          {financials.error ? (
            <DataErrorAlert error={financials.error} onRetry={() => financials.refetch()} />
          ) : !f ? (
            <BlockSkeleton lines={3} />
          ) : (
            <DetailList
              items={[
                { label: "Given before the app", value: formatCurrency(f.loans.openingGiven) },
                { label: `Given in the app (${formatNumber(f.loans.recordedCount)})`, value: formatCurrency(f.loans.recordedPrincipal) },
                { label: "Opening loans outstanding", value: formatCurrency(f.loans.openingOutstanding) },
                { label: "In-app loans outstanding", value: formatCurrency(f.loans.recordedOutstanding) },
                { label: "Open in-app loans", value: `${formatNumber(f.loans.openLoans)} · ${formatNumber(f.loans.overdueLoans)} overdue` },
                {
                  label: "Flexible loans not derivable",
                  value: f.loans.unknownFlexibleLoans
                    ? `${formatNumber(f.loans.unknownFlexibleLoans)} · ${formatCurrency(f.loans.unknownFlexiblePrincipal)} principal`
                    : "None",
                },
              ]}
            />
          )}
        </Panel>

        <Panel title="Opening balance" description={opening.data?.asOf ? `Captured ${formatDate(opening.data.asOf)}, before the group used the app` : "Before the group used the app"}>
          {opening.error ? (
            <DataErrorAlert error={opening.error} />
          ) : opening.isPending ? (
            <BlockSkeleton lines={3} />
          ) : opening.data ? (
            <DetailList
              items={[
                { label: "Savings", value: formatCurrency(opening.data.totalSavings) },
                { label: "Loans given (all time)", value: formatCurrency(opening.data.totalLoansGiven) },
                { label: "Loans outstanding", value: formatCurrency(opening.data.outstandingLoans) },
                { label: "Interest collected", value: formatCurrency(opening.data.totalInterestCollected) },
                { label: "Late fees collected", value: formatCurrency(opening.data.totalLateFeesCollected) },
                { label: "Other income / expense", value: `${formatCurrency(opening.data.otherIncome)} / ${formatCurrency(opening.data.otherExpense)}` },
              ]}
            />
          ) : (
            <p className="text-sm text-muted">No opening balance was entered for this group.</p>
          )}
        </Panel>

        <Panel title="Details and rules" description="As configured in the SHG app">
          {group.isPending || !g ? (
            <BlockSkeleton lines={3} />
          ) : (
            <DetailList
              items={[
                { label: "Village", value: g.village || EMPTY },
                { label: "Formed", value: formatDate(g.formationDate) },
                { label: "Meeting day", value: g.meetingDay ? `${ordinal(g.meetingDay)} of each month` : EMPTY },
                { label: "Monthly savings per member", value: formatCurrency(g.monthlySavings) },
                { label: "Loan interest", value: formatPercent(g.loanInterestMonthlyPct, " per month") },
                { label: "Late payment penalty", value: formatCurrency(g.latePenalty) },
                { label: "Payment grace period", value: g.paymentGraceDays != null ? `${g.paymentGraceDays} days` : EMPTY },
                { label: "Bank account", value: g.hasBankAccount ? "Recorded" : "None recorded" },
              ]}
            />
          )}
        </Panel>
      </div>
    </>
  );
}
