import { UserX } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canManagePartners, NoPartnerManageAccess, PartnersDirectoryUnavailable } from "@/components/admin/partner-gate";
import { NewPartnerForm } from "@/components/admin/new-partner-form";
import { PageContainer } from "@/components/page/page-container";
import { PageHeader } from "@/components/page/page-header";
import { Panel } from "@/components/page/panel";
import { EmptyBlock } from "@/components/states/empty-block";
import { getPartner, PartnerNotFoundError } from "@/lib/server/partner-admin";
import { PARTNER_NUMBER_PARAM } from "@/lib/server/partner-api";
import { getConsoleSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Edit partner · Partners" };

export default async function EditPartnerPage({ params }: { params: Promise<{ partnerNumber: string }> }) {
  const { partnerNumber } = await params;
  if (!PARTNER_NUMBER_PARAM.test(partnerNumber)) notFound();

  const session = await getConsoleSession();
  const permitted = session?.state === "active" && canManagePartners(session.employee.permissions);
  const header = (
    <PageHeader
      title="Edit partner"
      description="Update partner details. The Partner ID and category prefix policy are unchanged."
      breadcrumbs={[{ label: "Partners", href: "/partners" }, { label: partnerNumber }]}
    />
  );

  if (!permitted) {
    return (
      <PageContainer>
        {header}
        <NoPartnerManageAccess />
      </PageContainer>
    );
  }

  let partner;
  try {
    partner = await getPartner(partnerNumber);
  } catch (error) {
    if (error instanceof PartnerNotFoundError) notFound();
    return (
      <PageContainer>
        {header}
        <PartnersDirectoryUnavailable />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {header}
      {partner.status === "terminated" ? (
        <Panel>
          <EmptyBlock
            icon={UserX}
            title="This partner has been terminated"
            description="Terminated partners are kept for audit and cannot be edited."
            className="py-16"
          />
        </Panel>
      ) : (
        <NewPartnerForm
          edit={{
            partnerNumber: partner.partnerNumber,
            initial: {
              firstName: partner.firstName,
              secondName: partner.secondName,
              lastName: partner.lastName,
              mobile: partner.mobile,
              email: partner.email ?? "",
              partnerType: partner.partnerType,
              joinedAt: partner.joinedAt ?? "",
              address: partner.address,
              territory: partner.territory,
            },
          }}
        />
      )}
    </PageContainer>
  );
}
