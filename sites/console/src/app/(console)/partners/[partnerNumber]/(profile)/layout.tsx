import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  canManagePartners,
  canReadCommissions,
  canReadPartners,
  NoPartnerAccess,
  PartnersDirectoryUnavailable,
} from "@/components/admin/partner-gate";
import { PartnerProfileShell } from "@/components/partners/partner-profile-shell";
import { PageContainer } from "@/components/page/page-container";
import { getPartner, PartnerNotFoundError } from "@/lib/server/partner-admin";
import { PARTNER_NUMBER_PARAM } from "@/lib/server/partner-api";
import { getConsoleSession } from "@/lib/server/session";

export default async function PartnerProfileLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ partnerNumber: string }>;
}) {
  const { partnerNumber } = await params;
  if (!PARTNER_NUMBER_PARAM.test(partnerNumber)) notFound();

  const session = await getConsoleSession();
  const permissions = session?.state === "active" ? session.employee.permissions : [];
  const canRead = canReadPartners(permissions);
  if (!canRead) {
    return (
      <PageContainer>
        <NoPartnerAccess />
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
        <PartnersDirectoryUnavailable />
      </PageContainer>
    );
  }

  return (
    <PartnerProfileShell
      partner={partner}
      canManage={canManagePartners(permissions)}
      canReadCommissions={canReadCommissions(permissions)}
    >
      {children}
    </PartnerProfileShell>
  );
}
