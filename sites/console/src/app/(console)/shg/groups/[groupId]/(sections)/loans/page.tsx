import type { Metadata } from "next";
import { Suspense } from "react";
import { GroupLoansView } from "@/modules/shg/views/group-loans-view";

export const metadata: Metadata = { title: "Loans · Group · SHG" };

export default async function GroupLoansPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return (
    <Suspense>
      <GroupLoansView groupId={decodeURIComponent(groupId)} />
    </Suspense>
  );
}
