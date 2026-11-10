"use client";

import { EmployeesTable } from "@/components/admin/directory-tables";
import type { DirectoryEmployee } from "@/lib/server/workforce-directory";

export function EmployeesDirectory({
  employees,
  roleNames,
  selfEmail,
}: {
  employees: DirectoryEmployee[];
  roleNames: Record<string, string>;
  selfEmail: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="px-4 text-sm text-muted">
        {employees.length} {employees.length === 1 ? "employee" : "employees"}.
      </p>
      <EmployeesTable employees={employees} roleNames={roleNames} selfEmail={selfEmail} />
    </div>
  );
}
