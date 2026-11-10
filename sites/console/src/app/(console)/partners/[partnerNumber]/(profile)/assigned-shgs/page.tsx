import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UsersRound } from "lucide-react";
import { Panel } from "@/components/page/panel";
import { EmptyBlock } from "@/components/states/empty-block";
import { PARTNER_NUMBER_PARAM } from "@/lib/server/partner-api";

export const metadata: Metadata = { title: "Assigned SHGs · Partner" };

export default async function PartnerAssignedShgsPage({ params }: { params: Promise<{ partnerNumber: string }> }) {
  const { partnerNumber } = await params;
  if (!PARTNER_NUMBER_PARAM.test(partnerNumber)) notFound();

  return (
    <Panel title="Assigned SHGs" description="Groups attributed to this partner.">
      <EmptyBlock
        icon={UsersRound}
        title="Assigned SHGs are not available yet"
        description="SHG attribution by Partner ID will appear here after the SHG app records ownership. No groups are listed until then."
        className="py-16"
      />
    </Panel>
  );
}
