import type { Metadata } from "next";
import { GroupOverviewView } from "@/modules/shg/views/group-overview-view";

export const metadata: Metadata = { title: "Overview · Group · SHG" };

export default async function GroupOverviewPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return <GroupOverviewView groupId={decodeURIComponent(groupId)} />;
}
