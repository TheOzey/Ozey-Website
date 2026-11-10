"use client";

import { Chip, Label, ListBox, SearchField, Select } from "@heroui/react";
import { Handshake } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PartnerActions } from "@/components/admin/partner-actions";
import { type DataColumn, DataTable } from "@/components/tables/data-table";
import { EMPTY, formatDate } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useUrlState } from "@/lib/hooks/use-url-state";
import {
  PARTNER_STATUSES,
  PARTNER_STATUS_LABEL,
  PARTNER_TYPES,
  PARTNER_TYPE_LABEL,
  type PartnerStatus,
  type PartnerType,
} from "@/lib/partners/model";
import type { PartnerRecord } from "@/lib/server/partner-admin";

const PAGE_SIZE = 25;
const STATUS_COLOR = { active: "success", inactive: "warning", terminated: "default" } as const;

function partnerColumns(canManage: boolean): DataColumn<PartnerRecord>[] {
  const cols: DataColumn<PartnerRecord>[] = [
    {
      id: "name",
      label: "Name",
      isRowHeader: true,
      render: (p) => (
        <div className="min-w-0">
          <Link
            href={`/partners/${encodeURIComponent(p.partnerNumber)}`}
            className="truncate font-medium text-foreground underline-offset-4 hover:underline"
          >
            {p.displayName}
          </Link>
          <div className="truncate text-xs text-muted">{p.mobile}</div>
        </div>
      ),
    },
    {
      id: "number",
      label: "Partner ID",
      render: (p) => <span className="font-mono text-[13px] text-foreground">{p.partnerNumber}</span>,
    },
    {
      id: "type",
      label: "Partner type",
      render: (p) => PARTNER_TYPE_LABEL[p.partnerType],
    },
    {
      id: "mobile",
      label: "Mobile",
      render: (p) => <span className="font-mono text-[13px] text-foreground">{p.mobile}</span>,
    },
    {
      id: "district",
      label: "District",
      hideOnMobile: true,
      render: (p) => p.territory.district ?? EMPTY,
    },
    {
      id: "mandal",
      label: "Mandal / Block",
      hideOnMobile: true,
      render: (p) => p.territory.mandal ?? EMPTY,
    },
    {
      id: "assigned",
      label: "Assigned SHGs",
      hideOnMobile: true,
      render: () => <span className="text-muted">Unavailable</span>,
    },
    {
      id: "status",
      label: "Status",
      render: (p) => (
        <Chip size="sm" variant="soft" color={STATUS_COLOR[p.status] ?? "default"} className="capitalize">
          {PARTNER_STATUS_LABEL[p.status]}
        </Chip>
      ),
    },
    {
      id: "joined",
      label: "Joining date",
      hideOnMobile: true,
      render: (p) => <span className="text-muted">{formatDate(p.joinedAt ? new Date(`${p.joinedAt}T00:00:00Z`) : null)}</span>,
    },
  ];

  if (canManage) {
    cols.push({
      id: "actions",
      label: "Actions",
      align: "end",
      render: (p) => <PartnerActions partnerNumber={p.partnerNumber} displayName={p.displayName} status={p.status} />,
    });
  }

  return cols;
}

export function PartnersDirectory({
  partners,
  canManage,
}: {
  partners: PartnerRecord[];
  canManage: boolean;
}) {
  const [params, setParams] = useUrlState();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const debounced = useDebouncedValue(search.trim().toLowerCase());
  const typeFilter = (params.get("type") ?? "") as PartnerType | "";
  const districtFilter = params.get("district") ?? "";
  const statusFilter = (params.get("status") ?? "") as PartnerStatus | "";
  const pageNumber = Math.max(1, Number(params.get("page") ?? "1") || 1);

  const districts = useMemo(() => {
    const set = new Set<string>();
    for (const p of partners) {
      const d = p.territory.district?.trim();
      if (d) set.add(d);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [partners]);

  const filtered = useMemo(() => {
    return partners.filter((p) => {
      if (typeFilter && p.partnerType !== typeFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (districtFilter && (p.territory.district ?? "") !== districtFilter) return false;
      if (!debounced) return true;
      const hay = `${p.displayName} ${p.partnerNumber} ${p.mobile}`.toLowerCase();
      return hay.includes(debounced);
    });
  }, [partners, debounced, typeFilter, districtFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pageNumber, totalPages);
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isFiltered = Boolean(debounced || typeFilter || districtFilter || statusFilter);

  const pager =
    filtered.length > PAGE_SIZE
      ? {
          pageNumber: page,
          hasPrevious: page > 1,
          hasNext: page < totalPages,
          goPrevious: () => setParams({ page: page > 2 ? String(page - 1) : null }),
          goNext: () => setParams({ page: String(page + 1) }),
        }
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:flex-wrap sm:items-end">
        <SearchField
          aria-label="Search partners"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setParams({ q: value.trim() || null, page: null });
          }}
          className="min-w-[12rem] flex-1"
        >
          <Label className="sr-only">Search partners</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full sm:max-w-xs" placeholder="Name, Partner ID or mobile" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <Select
          aria-label="Partner type"
          placeholder="All types"
          className="w-full sm:w-44"
          value={typeFilter || null}
          onChange={(key) => setParams({ type: key ? String(key) : null, page: null })}
        >
          <Label className="sr-only">Type</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="" textValue="All types">
                All types
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {PARTNER_TYPES.map((t) => (
                <ListBox.Item key={t} id={t} textValue={PARTNER_TYPE_LABEL[t]}>
                  {PARTNER_TYPE_LABEL[t]}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          aria-label="District"
          placeholder="All districts"
          className="w-full sm:w-44"
          value={districtFilter || null}
          onChange={(key) => setParams({ district: key ? String(key) : null, page: null })}
        >
          <Label className="sr-only">District</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="" textValue="All districts">
                All districts
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {districts.map((d) => (
                <ListBox.Item key={d} id={d} textValue={d}>
                  {d}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          aria-label="Status"
          placeholder="All statuses"
          className="w-full sm:w-40"
          value={statusFilter || null}
          onChange={(key) => setParams({ status: key ? String(key) : null, page: null })}
        >
          <Label className="sr-only">Status</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="" textValue="All statuses">
                All statuses
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {PARTNER_STATUSES.map((s) => (
                <ListBox.Item key={s} id={s} textValue={PARTNER_STATUS_LABEL[s]}>
                  {PARTNER_STATUS_LABEL[s]}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <p className="px-4 text-sm text-muted">
        {filtered.length} {filtered.length === 1 ? "partner" : "partners"}
        {isFiltered ? " matching filters" : ""}.
      </p>

      <DataTable
        label="Partners"
        columns={partnerColumns(canManage)}
        items={slice}
        getKey={(p) => p.partnerNumber}
        isPending={false}
        error={null}
        empty={{
          icon: Handshake,
          title: "No partners yet",
          description: canManage ? "Add a Digital Sakhi or Digital Sarathi partner to get started." : undefined,
        }}
        isFiltered={isFiltered}
        pager={pager}
        minWidth={1100}
      />
    </div>
  );
}
