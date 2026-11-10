import type { Metadata } from "next";
import { ADMIN_PERMISSION, DirectoryUnavailable, NoAdminAccess } from "@/components/admin/admin-gate";
import { NewEmployeeForm } from "@/components/admin/new-employee-form";
import { PageContainer } from "@/components/page/page-container";
import { PageHeader } from "@/components/page/page-header";
import { hasPermission } from "@/lib/permissions/permissions";
import { getConsoleSession } from "@/lib/server/session";
import { listDirectoryRoles } from "@/lib/server/workforce-directory";

export const metadata: Metadata = { title: "Add employee · Employees" };

/**
 * Roles are read from Workforce `roles` on every request (the console layout
 * is force-dynamic), so a role created under Roles appears here immediately.
 * The page is only a convenience: POST /api/employees enforces the permission.
 */
export default async function NewEmployeePage() {
  const session = await getConsoleSession();
  const permitted = session?.state === "active" && hasPermission(session.employee.permissions, ADMIN_PERMISSION);
  const roles = permitted ? await listDirectoryRoles([]).catch(() => null) : null;

  return (
    <PageContainer>
      <PageHeader
        title="Add employee"
        description="Create an employee account for access to Ozey Console."
        breadcrumbs={[{ label: "Employees", href: "/employees" }, { label: "Add employee" }]}
      />
      {!permitted ? (
        <NoAdminAccess />
      ) : !roles ? (
        <DirectoryUnavailable />
      ) : (
        <NewEmployeeForm roles={roles.map((r) => ({ id: r.id, displayName: r.displayName, description: r.description, product: r.product, permissions: r.permissions }))} />
      )}
    </PageContainer>
  );
}
