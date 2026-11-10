import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page/page-header";
import { Panel } from "@/components/page/panel";
import { EmptyBlock } from "./empty-block";

/** For workspace sections intentionally not built yet. States why, never shows sample data. */
export function PlaceholderPage({
  title,
  description,
  icon,
  reason,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  reason: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Panel>
        <EmptyBlock icon={icon} title="Not available yet" description={reason} className="py-20" />
      </Panel>
    </>
  );
}
