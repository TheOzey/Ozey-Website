import { UserX } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ADMIN_PERMISSION, DirectoryUnavailable, NoAdminAccess } from "@/components/admin/admin-gate";
import { NewEmployeeForm } from "@/components/admin/new-employee-form";
import { PageContainer } from "@/components/page/page-container";
import { PageHeader } from "@/components/page/page-header";
import { Panel } from "@/components/page/panel";
import { EmptyBlock } from "@/components/states/empty-block";
import { hasPermission } from "@/lib/permissions/permissions";
import { EMPLOYEE_NUMBER_PARAM } from "@/lib/server/employee-api";
import { EmployeeNotFoundError, getEditableEmployee } from "@/lib/server/employee-admin";
import { getConsoleSession } from "@/lib/server/session";
import { listDirectoryRoles } from "@/lib/server/workforce-directory";

export const metadata: Metadata = { title: "Edit employee · Employees" };

/** Employees are addressed by their permanent employee number, never a document id. */
export default async function EditEmployeePage({ params }: { params: Promise<{ employeeNumber: string }> }) {
  const { employeeNumber } = await params;
  if (!EMPLOYEE_NUMBER_PARAM.test(employeeNumber)) notFound();

  const session = await getConsoleSession();
  const permitted = session?.state === "active" && hasPermission(session.employee.permissions, ADMIN_PERMISSION);
  const header = (
    <PageHeader
      title="Edit employee"
      description="Update this employee's details and roles. The employee ID cannot be changed."
      breadcrumbs={[{ label: "Employees", href: "/employees" }, { label: employeeNumber }]}
    />
  );
  if (!permitted) {
    return (
      <PageContainer>
        {header}
        <NoAdminAccess />
      </PageContainer>
    );
  }

  const loaded = await Promise.all([getEditableEmployee(employeeNumber), listDirectoryRoles([])]).catch((error) =>
    error instanceof EmployeeNotFoundError ? ("not-found" as const) : null,
  );
  if (loaded === "not-found") notFound();

  return (
    <PageContainer>
      {header}
      {!loaded ? (
        <DirectoryUnavailable />
      ) : loaded[0].status === "offboarded" ? (
        <Panel>
          <EmptyBlock icon={UserX} title="This employee has been deleted" description="Deleted employees are kept for the audit history and cannot be edited." className="py-16" />
        </Panel>
      ) : (
        <NewEmployeeForm
          roles={loaded[1].map((r) => ({ id: r.id, displayName: r.displayName, description: r.description, product: r.product, permissions: r.permissions }))}
          edit={{
            employeeNumber: loaded[0].employeeNumber,
            linked: loaded[0].linked,
            initial: {
              firstName: loaded[0].firstName,
              secondName: loaded[0].secondName,
              lastName: loaded[0].lastName,
              email: loaded[0].email,
              roles: loaded[0].roles,
              address: loaded[0].address,
            },
          }}
        />
      )}
    </PageContainer>
  );
}
