import type { Metadata } from "next";
import { ADMIN_PERMISSION, DirectoryUnavailable, NoAdminAccess, ReadOnlyNote } from "@/components/admin/admin-gate";
import { RolesTable } from "@/components/admin/directory-tables";
import { PageContainer } from "@/components/page/page-container";
import { PageHeader } from "@/components/page/page-header";
import { Panel } from "@/components/page/panel";
import { hasPermission } from "@/lib/permissions/permissions";
import { getConsoleSession } from "@/lib/server/session";
import { listDirectoryEmployees, listDirectoryRoles } from "@/lib/server/workforce-directory";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const session = await getConsoleSession();
  const permitted = session?.state === "active" && hasPermission(session.employee.permissions, ADMIN_PERMISSION);
  const roles = permitted ? await listDirectoryEmployees().then(listDirectoryRoles).catch(() => null) : null;

  return (
    <PageContainer>
      <PageHeader
        title="Roles"
        description="Roles group product-scoped permissions. An employee's access is the union of their roles; there is no wildcard or superuser."
      />
      {!permitted ? (
        <NoAdminAccess />
      ) : !roles ? (
        <DirectoryUnavailable />
      ) : (
        <>
          <Panel flush title="Roles and permissions" description={`${roles.length} ${roles.length === 1 ? "role" : "roles"}`}>
            <RolesTable roles={roles} />
          </Panel>
          <ReadOnlyNote>Defining roles or changing their permissions is not available in the Console yet; it is read-only.</ReadOnlyNote>
        </>
      )}
    </PageContainer>
  );
}
