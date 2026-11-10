import type { Metadata } from "next";
import { MemberDetailView } from "@/modules/shg/views/member-detail-view";

export const metadata: Metadata = { title: "Member · SHG" };

/**
 * Member ids are only unique within a group (SHG_DATA_MODEL.md §5), so the
 * route carries both ids and resolves the document directly by path. It sits
 * outside the group's section frame: a member page has its own header.
 */
export default async function MemberDetailPage({ params }: { params: Promise<{ groupId: string; memberId: string }> }) {
  const { groupId, memberId } = await params;
  return <MemberDetailView groupId={decodeURIComponent(groupId)} memberId={decodeURIComponent(memberId)} />;
}
