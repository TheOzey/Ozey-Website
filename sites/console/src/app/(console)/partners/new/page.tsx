import type { Metadata } from "next";
import { canManagePartners, NoPartnerManageAccess } from "@/components/admin/partner-gate";
import { NewPartnerForm } from "@/components/admin/new-partner-form";
import { PageContainer } from "@/components/page/page-container";
import { PageHeader } from "@/components/page/page-header";
import { PARTNERS_LIST } from "@/lib/partners/navigation";
import { getConsoleSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Add partner · Partners" };

export default async function NewPartnerPage() {
  const session = await getConsoleSession();
  const permitted = session?.state === "active" && canManagePartners(session.employee.permissions);

  return (
    <PageContainer>
      <PageHeader
        title="Add partner"
        description="Register a Digital Sakhi or Digital Sarathi partner. A Partner ID is assigned automatically."
        breadcrumbs={[{ label: "Partners", href: PARTNERS_LIST }, { label: "Add partner" }]}
      />
      {permitted ? <NewPartnerForm /> : <NoPartnerManageAccess />}
    </PageContainer>
  );
}
