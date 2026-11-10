import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  canManagePartners,
  canReadPartners,
  NoPartnerAccess,
  PartnersDirectoryUnavailable,
} from "@/components/admin/partner-gate";
import { PartnersDirectory } from "@/components/admin/partners-directory";
import { PageContainer } from "@/components/page/page-container";
import { PageHeader } from "@/components/page/page-header";
import { Panel } from "@/components/page/panel";
import { getConsoleSession } from "@/lib/server/session";
import { listPartners } from "@/lib/server/partner-admin";

export const metadata: Metadata = { title: "Partners" };

export default async function PartnersPage() {
  const session = await getConsoleSession();
  const permissions = session?.state === "active" ? session.employee.permissions : [];
  const canRead = canReadPartners(permissions);
  const canManage = canManagePartners(permissions);

  const partners = canRead ? await listPartners().catch(() => null) : null;
  const directory =
    partners === null
      ? null
      : (() => {
          const visible = partners.filter((p) => p.status !== "terminated");
          const terminatedCount = partners.length - visible.length;
          return { visible, terminatedCount };
        })();

  return (
    <PageContainer>
      <PageHeader
        title="Partners"
        description="Digital Sakhi and Digital Sarathi partners — external to Console sign-in, identified by Partner ID."
        actions={
          canManage ? (
            <Link href="/partners/new" className="button button--primary button--md" data-action="add-partner">
              <UserPlus className="size-4" aria-hidden />
              Add partner
            </Link>
          ) : null
        }
      />
      {!canRead ? (
        <NoPartnerAccess />
      ) : !directory ? (
        <PartnersDirectoryUnavailable />
      ) : (
        <Panel
          flush
          title="Directory"
          description={`${directory.visible.length} ${directory.visible.length === 1 ? "partner" : "partners"}${directory.terminatedCount ? ` · ${directory.terminatedCount} terminated (kept for audit)` : ""}`}
        >
          <PartnersDirectory partners={directory.visible} canManage={canManage} />
        </Panel>
      )}
    </PageContainer>
  );
}
