import type { Metadata } from "next";
import { Suspense } from "react";
import { GroupMembersView } from "@/modules/shg/views/group-members-view";

export const metadata: Metadata = { title: "Members · Group · SHG" };

export default async function GroupMembersPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return (
    <Suspense>
      <GroupMembersView groupId={decodeURIComponent(groupId)} />
    </Suspense>
  );
}
