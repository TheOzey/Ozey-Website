import { CloudOff, ShieldX } from "lucide-react";
import { Panel } from "@/components/page/panel";
import { EmptyBlock } from "@/components/states/empty-block";

export { EMPLOYEES_MANAGE as ADMIN_PERMISSION } from "@/lib/permissions/permissions";

export function NoAdminAccess() {
  return (
    <Panel>
      <EmptyBlock
        icon={ShieldX}
        title="You don't have access to the workforce directory"
        description="Employees and roles are visible with the console:employees.manage permission (the console-admin role)."
        className="py-16"
      />
    </Panel>
  );
}

export function DirectoryUnavailable() {
  return (
    <Panel>
      <EmptyBlock
        icon={CloudOff}
        title="The workforce directory could not be read"
        description="Nothing was changed. Reload to try again."
        className="py-16"
      />
    </Panel>
  );
}

/** States plainly that the console cannot change the directory yet. */
export function ReadOnlyNote({ children }: { children: string }) {
  return <p className="mt-4 text-xs text-muted">{children}</p>;
}
