import type { Metadata } from "next";
import { ShgOverview } from "@/modules/shg/views/overview-view";

export const metadata: Metadata = { title: "SHG overview" };

export default function ShgOverviewPage() {
  return <ShgOverview />;
}
