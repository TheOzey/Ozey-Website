import { Link2Off, ShieldX } from "lucide-react";
import type { ReactNode } from "react";
import { Panel } from "@/components/page/panel";
import { ProductHeader } from "@/components/shell/product-header";
import { PageContainer } from "@/components/page/page-container";
import { EmptyBlock } from "@/components/states/empty-block";
import { canAccessProduct } from "@/lib/permissions/access";
import { getConsoleSession } from "@/lib/server/session";
import { SHG_DATA_CONNECTION } from "@/modules/shg/connection";
import { ShgChrome } from "@/modules/shg/views/shg-chrome";

/** Product-level gate, checked on the server from the employee's permissions. */
export default async function ShgLayout({ children }: { children: ReactNode }) {
  const session = await getConsoleSession();
  const permissions = session?.state === "active" ? session.employee.permissions : [];

  if (!canAccessProduct(permissions, "shg")) {
    return (
      <>
        <ProductHeader product="shg" showNavigation={false} />
        <PageContainer>
          <Panel>
            <EmptyBlock
              icon={ShieldX}
              title="You don't have SHG access"
              description="Viewing SHG requires the shg:read permission (for example through the shg-viewer role). Ask a console administrator."
              className="py-16"
            />
          </Panel>
        </PageContainer>
      </>
    );
  }

  if (SHG_DATA_CONNECTION === "connected") {
    return <ShgChrome>{children}</ShgChrome>;
  }

  return (
    <>
      <ProductHeader product="shg" showNavigation={false} />
      <PageContainer>
        <Panel>
          <EmptyBlock
            icon={Link2Off}
            title="SHG data is not connected yet"
            description="You hold shg:read. The console will read SHG data only through a short-lived, shg:read-scoped credential that SHG's own security rules verify. That exchange is not built yet, so no SHG data is loaded."
            className="py-16"
          />
        </Panel>
      </PageContainer>
    </>
  );
}
