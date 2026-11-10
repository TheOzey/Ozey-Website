"use client";

import { Chip } from "@heroui/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavTabs } from "@/components/navigation/nav-tabs";
import { PageContainer } from "@/components/page/page-container";
import { ContextHeader } from "@/components/shell/context-header";
import { CopyCodeButton } from "@/components/partners/copy-code-button";
import { partnerProfileTabs, partnerRoutes } from "@/lib/partners/navigation";
import { PARTNER_STATUS_LABEL, PARTNER_TYPE_LABEL } from "@/lib/partners/model";
import type { PartnerRecord } from "@/lib/server/partner-admin";

const STATUS_COLOR = { active: "success", inactive: "warning", terminated: "default" } as const;

export function PartnerProfileShell({
  partner,
  canManage,
  canReadCommissions = false,
  children,
}: {
  partner: PartnerRecord;
  canManage: boolean;
  /** Commission / Settlements tabs require console:commissions.read independently. */
  canReadCommissions?: boolean;
  children: ReactNode;
}) {
  const routes = partnerRoutes(partner.partnerNumber);
  const tabs = partnerProfileTabs(partner.partnerNumber, { includeCommissions: canReadCommissions });

  return (
    <>
      <ContextHeader
        identity={
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl leading-tight font-semibold tracking-[-0.025em] text-foreground">
                {partner.displayName}
              </h1>
              <p className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-2 text-sm text-muted">
                <span className="font-mono text-foreground">{partner.partnerNumber}</span>
                <span aria-hidden>·</span>
                <span>{PARTNER_TYPE_LABEL[partner.partnerType]}</span>
                <span aria-hidden>·</span>
                <span>{partner.mobile}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CopyCodeButton value={partner.partnerNumber} label="Copy ID" />
              <Chip
                size="sm"
                variant="soft"
                color={STATUS_COLOR[partner.status] ?? "default"}
                className="capitalize"
              >
                {PARTNER_STATUS_LABEL[partner.status]}
              </Chip>
              {canManage && partner.status !== "terminated" ? (
                <Link href={routes.edit} className="button button--secondary button--sm">
                  Edit
                </Link>
              ) : null}
            </div>
          </div>
        }
        navigation={<NavTabs level="section" divider={false} label="Partner sections" tabs={tabs} />}
        compactTitle={partner.displayName}
      />
      <PageContainer>{children}</PageContainer>
    </>
  );
}
