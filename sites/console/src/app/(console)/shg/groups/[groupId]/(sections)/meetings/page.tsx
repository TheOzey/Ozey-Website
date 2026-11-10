import type { Metadata } from "next";
import { GroupMeetingsView } from "@/modules/shg/views/group-meetings-view";

export const metadata: Metadata = { title: "Meetings · Group · SHG" };

export default async function GroupMeetingsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return <GroupMeetingsView groupId={decodeURIComponent(groupId)} />;
}
