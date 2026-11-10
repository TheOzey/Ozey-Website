import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ADMIN_PERMISSION, DirectoryUnavailable, NoAdminAccess } from "@/components/admin/admin-gate";
import { EmployeesDirectory } from "@/components/admin/employees-directory";
import { PageContainer } from "@/components/page/page-container";
import { PageHeader } from "@/components/page/page-header";
import { Panel } from "@/components/page/panel";
import { hasPermission } from "@/lib/permissions/permissions";
import { getConsoleSession } from "@/lib/server/session";
import { roleLabel } from "@/lib/employees/migrations";
import { listDirectoryEmployees, listDirectoryRoles } from "@/lib/server/workforce-directory";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const session = await getConsoleSession();
  const permitted = session?.state === "active" && hasPermission(session.employee.permissions, ADMIN_PERMISSION);
  const directory = permitted
    ? await listDirectoryEmployees()
        .then(async (employees) => ({ employees, roles: await listDirectoryRoles(employees) }))
        .catch(() => null)
    : null;
  // Deleted employees (status "offboarded") leave the directory; their records
  // stay in Workforce for the audit history.
  const employees = directory ? directory.employees.filter((e) => e.status !== "offboarded") : null;
  const deletedCount = directory ? directory.employees.length - (employees?.length ?? 0) : 0;
  const roleNames = Object.fromEntries((directory?.roles ?? []).map((r) => [r.id, roleLabel(r)]));

  return (
    <PageContainer>
      <PageHeader
        title="Employees"
        description="Ozey employees who can sign in to the Console, and the roles they hold."
        actions={
          permitted ? (
            <Link href="/employees/new" className="button button--primary button--md" data-action="add-employee">
              <UserPlus className="size-4" aria-hidden />
              Add employee
            </Link>
          ) : null
        }
      />
      {!permitted ? (
        <NoAdminAccess />
      ) : !employees ? (
        <DirectoryUnavailable />
      ) : (
        <Panel
          flush
          title="Directory"
          description={`${employees.length} ${employees.length === 1 ? "employee" : "employees"}${deletedCount ? ` · ${deletedCount} deleted (kept for audit)` : ""}`}
        >
          <EmployeesDirectory employees={employees} roleNames={roleNames} selfEmail={session?.state === "active" ? session.employee.email : null} />
        </Panel>
      )}
    </PageContainer>
  );
}
