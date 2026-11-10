import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Banknote } from "lucide-react";
import { canReadCommissions, NoCommissionAccess } from "@/components/admin/partner-gate";
import { Panel } from "@/components/page/panel";
import { EmptyBlock } from "@/components/states/empty-block";
import { PARTNER_NUMBER_PARAM } from "@/lib/server/partner-api";
import { getConsoleSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Settlements · Partner" };

export default async function PartnerSettlementsPage({ params }: { params: Promise<{ partnerNumber: string }> }) {
  const { partnerNumber } = await params;
  if (!PARTNER_NUMBER_PARAM.test(partnerNumber)) notFound();

  const session = await getConsoleSession();
  const permissions = session?.state === "active" ? session.employee.permissions : [];
  if (!canReadCommissions(permissions)) return <NoCommissionAccess />;

  return (
    <Panel title="Settlements" description="Monthly settlement batches. Recording settlements stays disabled until billing exists.">
      <EmptyBlock
        icon={Banknote}
        title="Settlements are not available yet"
        description="Settlement history and recording will appear after the commission ledger is connected. No settlement mutations are enabled."
        className="py-16"
      />
    </Panel>
  );
}
