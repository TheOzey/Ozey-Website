import { CloudOff, ShieldX } from "lucide-react";
import { Panel } from "@/components/page/panel";
import { EmptyBlock } from "@/components/states/empty-block";

export {
  canManagePartners,
  canReadCommissions,
  canReadPartners,
  canSettleCommissions,
  partnerSectionAllowed,
} from "@/lib/partners/authorization";

export function NoPartnerAccess() {
  return (
    <Panel>
      <EmptyBlock
        icon={ShieldX}
        title="You don't have access to Partners"
        description="The Partners directory and profiles require the console:partners.read permission. Managing partners requires console:partners.manage."
        className="py-16"
      />
    </Panel>
  );
}

export function NoPartnerManageAccess() {
  return (
    <Panel>
      <EmptyBlock
        icon={ShieldX}
        title="You can't manage partners"
        description="Creating, editing and deactivating partners requires the console:partners.manage permission."
        className="py-16"
      />
    </Panel>
  );
}

export function NoCommissionAccess() {
  return (
    <Panel>
      <EmptyBlock
        icon={ShieldX}
        title="You don't have access to commissions"
        description="Commission ledger and settlements require the console:commissions.read permission. Partner access alone is not enough."
        className="py-16"
      />
    </Panel>
  );
}

export function PartnersDirectoryUnavailable() {
  return (
    <Panel>
      <EmptyBlock
        icon={CloudOff}
        title="The partners directory could not be read"
        description="Nothing was changed. Reload to try again."
        className="py-16"
      />
    </Panel>
  );
}
