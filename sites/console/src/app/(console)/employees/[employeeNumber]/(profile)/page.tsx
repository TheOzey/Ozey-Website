import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailList } from "@/components/data/detail-list";
import { Panel } from "@/components/page/panel";
import { ADDRESS_FIELDS } from "@/lib/employees/new-employee";
import { roleLabel } from "@/lib/employees/migrations";
import { EMPTY, formatDate, formatDateTime } from "@/lib/format";
import { EMPLOYEE_NUMBER_PARAM } from "@/lib/server/employee-api";
import { getEmployeeProfile } from "@/lib/server/employee-profile";
import { listDirectoryRoles } from "@/lib/server/workforce-directory";

export const metadata: Metadata = { title: "Employee" };

export default async function EmployeeOverviewPage({ params }: { params: Promise<{ employeeNumber: string }> }) {
  const { employeeNumber } = await params;
  if (!EMPLOYEE_NUMBER_PARAM.test(employeeNumber)) notFound();
  const [profile, roles] = await Promise.all([getEmployeeProfile(employeeNumber), listDirectoryRoles([])]);
  const roleNames = Object.fromEntries(roles.map((r) => [r.id, roleLabel(r)]));

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Overview" description="Console workforce identity and access roles.">
        <DetailList
          columns={2}
          items={[
            { label: "Employee ID", value: <span className="font-mono font-semibold">{profile.employeeNumber}</span> },
            { label: "Status", value: <span className="capitalize">{profile.status}</span> },
            { label: "Email", value: profile.email },
            {
              label: "Roles",
              value: profile.roles.length ? profile.roles.map((id) => roleNames[id] ?? id).join(", ") : EMPTY,
            },
            { label: "Last sign-in", value: profile.linked ? formatDateTime(profile.lastSignInAt ? new Date(profile.lastSignInAt) : null) : "Never signed in" },
            { label: "Created", value: formatDate(profile.createdAt ? new Date(profile.createdAt) : null) },
            { label: "Updated", value: formatDate(profile.updatedAt ? new Date(profile.updatedAt) : null) },
          ]}
        />
      </Panel>

      {Object.keys(profile.address).length > 0 ? (
        <Panel title="Address">
          <DetailList
            columns={3}
            items={ADDRESS_FIELDS.filter((f) => profile.address[f.key]).map((f) => ({
              label: f.label,
              value: profile.address[f.key],
            }))}
          />
        </Panel>
      ) : null}
    </div>
  );
}
