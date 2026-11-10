import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailList } from "@/components/data/detail-list";
import { CopyCodeButton } from "@/components/partners/copy-code-button";
import { Panel } from "@/components/page/panel";
import { EMPTY, formatDate } from "@/lib/format";
import { PARTNER_ADDRESS_FIELDS, PARTNER_STATUS_LABEL, PARTNER_TYPE_LABEL } from "@/lib/partners/model";
import { getPartner } from "@/lib/server/partner-admin";
import { PARTNER_NUMBER_PARAM } from "@/lib/server/partner-api";

export const metadata: Metadata = { title: "Partner" };

export default async function PartnerOverviewPage({ params }: { params: Promise<{ partnerNumber: string }> }) {
  const { partnerNumber } = await params;
  if (!PARTNER_NUMBER_PARAM.test(partnerNumber)) notFound();
  const partner = await getPartner(partnerNumber);

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Overview" description="External partner identity and territory. Partners do not have Console roles.">
        <DetailList
          columns={2}
          items={[
            {
              label: "Partner ID",
              value: (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold">{partner.partnerNumber}</span>
                  <CopyCodeButton value={partner.partnerNumber} />
                </span>
              ),
            },
            { label: "Type", value: PARTNER_TYPE_LABEL[partner.partnerType] },
            { label: "Status", value: PARTNER_STATUS_LABEL[partner.status] },
            { label: "Mobile", value: partner.mobile },
            { label: "Email", value: partner.email ?? EMPTY },
            { label: "Joining date", value: formatDate(partner.joinedAt ? new Date(`${partner.joinedAt}T00:00:00Z`) : null) },
            { label: "Created", value: formatDate(partner.createdAt ? new Date(partner.createdAt) : null) },
            { label: "Updated", value: formatDate(partner.updatedAt ? new Date(partner.updatedAt) : null) },
          ]}
        />
      </Panel>

      {Object.keys(partner.territory).length > 0 ? (
        <Panel title="Territory">
          <DetailList
            columns={2}
            items={[
              { label: "State", value: partner.territory.state ?? EMPTY },
              { label: "District", value: partner.territory.district ?? EMPTY },
              { label: "Mandal / Block", value: partner.territory.mandal ?? EMPTY },
              { label: "Village", value: partner.territory.village ?? EMPTY },
            ]}
          />
        </Panel>
      ) : null}

      {Object.keys(partner.address).length > 0 ? (
        <Panel title="Address">
          <DetailList
            columns={3}
            items={PARTNER_ADDRESS_FIELDS.filter((f) => partner.address[f.key]).map((f) => ({
              label: f.label,
              value: partner.address[f.key],
            }))}
          />
        </Panel>
      ) : null}
    </div>
  );
}
