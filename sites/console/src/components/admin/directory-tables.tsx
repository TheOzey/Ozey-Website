"use client";

import { Chip } from "@heroui/react";
import { ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { type DataColumn, DataTable } from "@/components/tables/data-table";
import { EMPTY, formatDate, formatDateTime } from "@/lib/format";
import { roleLabel } from "@/lib/employees/migrations";
import { EmployeeActions } from "./employee-actions";
import type { DirectoryEmployee, DirectoryRole } from "@/lib/server/workforce-directory";

const STATUS_COLOR = { active: "success", invited: "accent", suspended: "warning", offboarded: "default" } as const;
const date = (value: string | null) => (value ? new Date(value) : null);

function Code({ children }: { children: string }) {
  return <code className="rounded bg-default px-1.5 py-0.5 font-mono text-[12px] text-foreground">{children}</code>;
}

const employeeColumns = (roleNames: Record<string, string>, selfEmail: string | null): DataColumn<DirectoryEmployee>[] => [
  {
    id: "name",
    label: "Employee",
    isRowHeader: true,
    render: (e) => (
      <div className="min-w-0">
        {e.employeeNumber ? (
          <Link href={`/employees/${encodeURIComponent(e.employeeNumber)}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {e.displayName}
          </Link>
        ) : (
          <div className="truncate font-medium text-foreground">{e.displayName}</div>
        )}
        <div className="truncate text-xs text-muted">{e.email}</div>
      </div>
    ),
  },
  {
    id: "number",
    label: "Employee ID",
    render: (e) =>
      e.employeeNumber ? (
        <span className="font-mono text-[13px] text-foreground">{e.employeeNumber}</span>
      ) : (
        <span className="text-muted" title="Created before employee IDs were introduced">
          Not assigned
        </span>
      ),
  },
  {
    id: "status",
    label: "Status",
    render: (e) => (
      <Chip size="sm" variant="soft" color={STATUS_COLOR[e.status] ?? "default"} className="capitalize">
        {e.status}
      </Chip>
    ),
  },
  {
    id: "roles",
    label: "Role(s)",
    render: (e) =>
      e.roles.length ? (
        <span className="flex flex-wrap gap-1">
          {e.roles.map((r) => (
            <span key={r} className="rounded bg-default px-1.5 py-0.5 text-[12px] text-foreground" title={r}>
              {roleNames[r] ?? r}
            </span>
          ))}
        </span>
      ) : (
        <span className="text-muted">{EMPTY}</span>
      ),
  },
  {
    id: "signin",
    label: "Last sign-in",
    hideOnMobile: true,
    render: (e) => <span className="text-muted">{e.linked ? formatDateTime(date(e.lastSignInAt)) : "Never signed in"}</span>,
  },
  { id: "added", label: "Added", hideOnMobile: true, render: (e) => <span className="text-muted">{formatDate(date(e.createdAt))}</span> },
  {
    id: "actions",
    label: "Actions",
    align: "end",
    render: (e) => <EmployeeActions employeeNumber={e.employeeNumber} displayName={e.displayName} isSelf={e.email === selfEmail} />,
  },
];

const roleColumns: DataColumn<DirectoryRole>[] = [
  {
    id: "role",
    label: "Role",
    isRowHeader: true,
    render: (r) => (
      <div className="min-w-0">
        <div className="font-medium text-foreground">{roleLabel(r)}</div>
        <div className="font-mono text-[11px] text-muted">{r.id}</div>
        {r.description ? <div className="text-xs text-muted">{r.description}</div> : null}
      </div>
    ),
  },
  { id: "scope", label: "Scope", render: (r) => <span className="text-muted uppercase">{r.product ?? "console"}</span> },
  {
    id: "permissions",
    label: "Permissions",
    render: (r) => (
      <span className="flex flex-wrap gap-1">
        {r.permissions.map((p) => (
          <Code key={p}>{p}</Code>
        ))}
      </span>
    ),
  },
  { id: "employees", label: "Employees", align: "end", render: (r) => r.employeeCount },
  { id: "updated", label: "Updated", hideOnMobile: true, render: (r) => <span className="text-muted">{formatDate(date(r.updatedAt))}</span> },
];

/**
 * `roleNames` maps role id → display name (ids without one are shown as-is).
 * `selfEmail` is the signed-in administrator, who cannot delete themselves.
 */
export function EmployeesTable({
  employees,
  roleNames,
  selfEmail,
}: {
  employees: DirectoryEmployee[];
  roleNames: Record<string, string>;
  selfEmail: string | null;
}) {
  return (
    <DataTable
      label="Employees"
      columns={employeeColumns(roleNames, selfEmail)}
      items={employees}
      getKey={(e) => e.email}
      isPending={false}
      error={null}
      empty={{ icon: UsersRound, title: "No employees yet" }}
      minWidth={900}
    />
  );
}

export function RolesTable({ roles }: { roles: DirectoryRole[] }) {
  return (
    <DataTable
      label="Roles"
      columns={roleColumns}
      items={roles}
      getKey={(r) => r.id}
      isPending={false}
      error={null}
      empty={{ icon: ShieldCheck, title: "No roles defined" }}
      minWidth={600}
    />
  );
}
