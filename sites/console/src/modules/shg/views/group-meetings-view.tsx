"use client";

import { CalendarDays } from "lucide-react";
import { Panel } from "@/components/page/panel";
import { type DataColumn, DataTable } from "@/components/tables/data-table";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/format";
import { useMeetingsPage } from "../queries";
import type { ShgMeeting } from "../types";
import { SectionIntro } from "./group-shell";

/** One group's meetings. The group comes from the route, never from a filter. */
export function GroupMeetingsView({ groupId }: { groupId: string }) {
  const page = useMeetingsPage(groupId);

  const columns: DataColumn<ShgMeeting>[] = [
    { id: "date", label: "Date", isRowHeader: true, render: (m) => <span className="tabular">{formatDate(m.date)}</span> },
    { id: "period", label: "Period", hideOnMobile: true, render: (m) => <span className="text-muted">{formatPeriod(m.period)}</span> },
    { id: "attendance", label: "Attendance", align: "end", render: (m) => `${m.attendeeCount} / ${m.totalMembers}` },
    { id: "savings", label: "Savings collected", align: "end", render: (m) => formatCurrency(m.savingsCollected) },
    { id: "repaid", label: "Loans repaid", align: "end", hideOnMobile: true, render: (m) => formatCurrency(m.loansRepaid) },
    { id: "disbursed", label: "Loans disbursed", align: "end", hideOnMobile: true, render: (m) => formatCurrency(m.loansDisbursed) },
    { id: "income", label: "Other income", align: "end", hideOnMobile: true, render: (m) => formatCurrency(m.extraIncome) },
    { id: "spent", label: "Expenses", align: "end", hideOnMobile: true, render: (m) => formatCurrency(m.moneySpent) },
  ];

  return (
    <>
      <SectionIntro>This group&apos;s meetings newest first, with attendance and the money recorded at each meeting.</SectionIntro>
      <Panel flush>
        <DataTable
          label="Group meetings"
          columns={columns}
          items={page.items}
          getKey={(m) => `${m.groupId}:${m.id}`}
          isPending={page.query.isPending}
          isFetching={page.query.isFetching}
          error={page.query.error}
          onRetry={() => page.query.refetch()}
          empty={{ icon: CalendarDays, title: "No meetings recorded for this group", description: "Meetings recorded in the SHG app will appear here." }}
          pager={page}
          minWidth={860}
        />
      </Panel>
    </>
  );
}
