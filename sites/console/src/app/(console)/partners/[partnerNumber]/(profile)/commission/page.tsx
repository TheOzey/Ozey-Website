import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Receipt } from "lucide-react";
import { canReadCommissions, NoCommissionAccess } from "@/components/admin/partner-gate";
import { CommissionPolicyNote } from "@/components/partners/commission-policy-note";
import { Panel } from "@/components/page/panel";
import { EmptyBlock } from "@/components/states/empty-block";
import { PARTNER_NUMBER_PARAM } from "@/lib/server/partner-api";
import { getConsoleSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Commission · Partner" };

export default async function PartnerCommissionPage({ params }: { params: Promise<{ partnerNumber: string }> }) {
  const { partnerNumber } = await params;
  if (!PARTNER_NUMBER_PARAM.test(partnerNumber)) notFound();

  const session = await getConsoleSession();
  const permissions = session?.state === "active" ? session.employee.permissions : [];
  if (!canReadCommissions(permissions)) return <NoCommissionAccess />;

  return (
    <div className="flex flex-col gap-6">
      <CommissionPolicyNote />
      <Panel title="Commission ledger" description="Earned commission from subscription billing.">
        <EmptyBlock
          icon={Receipt}
          title="Commission ledger is not available yet"
          description="Ledger entries will appear after subscription billing is connected. No amounts are calculated in this phase."
          className="py-16"
        />
      </Panel>
    </div>
  );
}
