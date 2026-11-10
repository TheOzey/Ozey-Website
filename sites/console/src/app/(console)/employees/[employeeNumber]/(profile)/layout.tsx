import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ADMIN_PERMISSION, DirectoryUnavailable, NoAdminAccess } from "@/components/admin/admin-gate";
import { EmployeeProfileShell } from "@/components/admin/employee-profile-shell";
import { PageContainer } from "@/components/page/page-container";
import { hasPermission } from "@/lib/permissions/permissions";
import { EMPLOYEE_NUMBER_PARAM } from "@/lib/server/employee-api";
import { EmployeeNotFoundError } from "@/lib/server/employee-admin";
import { getEmployeeProfile } from "@/lib/server/employee-profile";
import { getConsoleSession } from "@/lib/server/session";

export default async function EmployeeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ employeeNumber: string }>;
}) {
  const { employeeNumber } = await params;
  if (!EMPLOYEE_NUMBER_PARAM.test(employeeNumber)) notFound();

  const session = await getConsoleSession();
  const permitted = session?.state === "active" && hasPermission(session.employee.permissions, ADMIN_PERMISSION);
  if (!permitted) {
    return (
      <PageContainer>
        <NoAdminAccess />
      </PageContainer>
    );
  }

  let profile;
  try {
    profile = await getEmployeeProfile(employeeNumber);
  } catch (error) {
    if (error instanceof EmployeeNotFoundError) notFound();
    return (
      <PageContainer>
        <DirectoryUnavailable />
      </PageContainer>
    );
  }

  return <EmployeeProfileShell profile={profile}>{children}</EmployeeProfileShell>;
}
