"use client";

import {
  Button,
  DateField,
  DateRangePicker,
  Label,
  ListBox,
  RangeCalendar,
  Select,
} from "@heroui/react";
import { type CalendarDate, parseDate } from "@internationalized/date";
import { ArrowLeftRight } from "lucide-react";
import { useMemo } from "react";
import { Panel } from "@/components/page/panel";
import { type DataColumn, DataTable } from "@/components/tables/data-table";
import { EMPTY, formatDate, formatPeriod } from "@/lib/format";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { TransactionAmount } from "../components/amount";
import { TRANSACTION_KIND_LABEL, transactionLabel } from "../components/labels";
import { MemberPicker } from "../components/member-picker";
import { useTransactionsPage } from "../queries";
import { TRANSACTION_KINDS } from "../services";
import type { ShgTransaction, TransactionKind } from "../types";
import { SectionIntro } from "./group-shell";

function parseDay(value: string | null): CalendarDate | null {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

/** One group's transactions. The group comes from the route, never from a filter. */
export function GroupTransactionsView({ groupId }: { groupId: string }) {
  const [params, setParams] = useUrlState();
  const kindParam = params.get("type");
  const kind = TRANSACTION_KINDS.includes(kindParam as TransactionKind) ? (kindParam as TransactionKind) : null;
  const memberId = params.get("member");
  const fromDay = parseDay(params.get("from"));
  const toDay = parseDay(params.get("to"));

  // Inclusive calendar days; the server applies SHG's (IST) day boundaries.
  const filters = useMemo(
    () => ({
      kinds: kind ? [kind] : undefined,
      groupId,
      memberId,
      from: fromDay ? fromDay.toString() : null,
      to: toDay ? toDay.toString() : null,
    }),
    [kind, groupId, memberId, fromDay, toDay],
  );

  const page = useTransactionsPage(filters);
  const isFiltered = Boolean(kind || memberId || fromDay || toDay);

  const columns: DataColumn<ShgTransaction>[] = [
    { id: "date", label: "Date", render: (t) => <span className="text-muted tabular">{formatDate(t.date)}</span> },
    {
      id: "type",
      label: "Type",
      render: (t) => (
        <span>
          {transactionLabel(t)}
          {t.isReversal ? <span className="text-danger"> · reversal</span> : null}
        </span>
      ),
    },
    { id: "member", label: "Member", isRowHeader: true, render: (t) => t.memberName ?? <span className="text-muted">{EMPTY}</span> },
    { id: "period", label: "Period", hideOnMobile: true, render: (t) => <span className="text-muted">{formatPeriod(t.period)}</span> },
    { id: "notes", label: "Notes", hideOnMobile: true, render: (t) => <span className="text-muted">{t.notes ?? EMPTY}</span> },
    { id: "amount", label: "Amount", align: "end", render: (t) => <TransactionAmount tx={t} /> },
  ];

  return (
    <>
      <SectionIntro>
        Payments recorded in the app, newest first: savings, loan repayments, collections against opening balances
        (loan, late fee, interest) and late fines. Reversals appear as negative entries, as the app records them. Loans
        given are not payments; they are on the Loans tab.
      </SectionIntro>
      <Panel
        flush
        title={
          <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
            <Select
              aria-label="Transaction type"
              className="w-full sm:w-48"
              value={kind ?? "all"}
              onChange={(value) => setParams({ type: value === "all" ? null : String(value) })}
            >
              <Label className="sr-only">Type</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue="All types">
                    All types
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {TRANSACTION_KINDS.map((k) => (
                    <ListBox.Item key={k} id={k} textValue={TRANSACTION_KIND_LABEL[k]}>
                      {TRANSACTION_KIND_LABEL[k]}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <MemberPicker groupId={groupId} value={memberId} onChange={(id) => setParams({ member: id })} />

            <DateRangePicker
              aria-label="Date range"
              className="w-full sm:w-auto"
              value={fromDay && toDay ? { start: fromDay, end: toDay } : null}
              onChange={(range) =>
                setParams({ from: range ? range.start.toString() : null, to: range ? range.end.toString() : null })
              }
            >
              <Label className="sr-only">Date range</Label>
              <DateField.Group fullWidth>
                <DateField.Input slot="start">{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                <DateRangePicker.RangeSeparator />
                <DateField.Input slot="end">{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                <DateField.Suffix>
                  <DateRangePicker.Trigger>
                    <DateRangePicker.TriggerIndicator />
                  </DateRangePicker.Trigger>
                </DateField.Suffix>
              </DateField.Group>
              <DateRangePicker.Popover>
                <RangeCalendar aria-label="Date range">
                  <RangeCalendar.Header>
                    <RangeCalendar.YearPickerTrigger>
                      <RangeCalendar.YearPickerTriggerHeading />
                      <RangeCalendar.YearPickerTriggerIndicator />
                    </RangeCalendar.YearPickerTrigger>
                    <RangeCalendar.NavButton slot="previous" />
                    <RangeCalendar.NavButton slot="next" />
                  </RangeCalendar.Header>
                  <RangeCalendar.Grid>
                    <RangeCalendar.GridHeader>
                      {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
                    </RangeCalendar.GridHeader>
                    <RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
                  </RangeCalendar.Grid>
                  <RangeCalendar.YearPickerGrid>
                    <RangeCalendar.YearPickerGridBody>
                      {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
                    </RangeCalendar.YearPickerGridBody>
                  </RangeCalendar.YearPickerGrid>
                </RangeCalendar>
              </DateRangePicker.Popover>
            </DateRangePicker>

            {isFiltered ? (
              <Button
                size="sm"
                variant="ghost"
                onPress={() => setParams({ type: null, member: null, from: null, to: null })}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        }
      >
        <DataTable
          label="Group transactions"
          columns={columns}
          items={page.items}
          getKey={(t) => t.key}
          isPending={page.query.isPending}
          isFetching={page.query.isFetching}
          error={page.query.error}
          onRetry={() => page.query.refetch()}
          empty={{ icon: ArrowLeftRight, title: "No transactions recorded for this group" }}
          isFiltered={isFiltered}
          pager={page}
          minWidth={720}
        />
      </Panel>
    </>
  );
}
