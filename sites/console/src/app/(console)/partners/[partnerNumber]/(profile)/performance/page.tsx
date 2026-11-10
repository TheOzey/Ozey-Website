import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartColumn } from "lucide-react";
import { Panel } from "@/components/page/panel";
import { EmptyBlock } from "@/components/states/empty-block";
import { PARTNER_NUMBER_PARAM } from "@/lib/server/partner-api";

export const metadata: Metadata = { title: "Performance · Partner" };

export default async function PartnerPerformancePage({ params }: { params: Promise<{ partnerNumber: string }> }) {
  const { partnerNumber } = await params;
  if (!PARTNER_NUMBER_PARAM.test(partnerNumber)) notFound();

  return (
    <Panel title="Performance" description="Partner portfolio and collection metrics.">
      <EmptyBlock
        icon={ChartColumn}
        title="Performance is not available yet"
        description="Assigned SHG counts, collections and commission totals will appear here after SHG attribution and billing are connected."
        className="py-16"
      />
    </Panel>
  );
}
