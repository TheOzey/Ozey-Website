import type { Metadata } from "next";
import { Suspense } from "react";
import { GroupTransactionsView } from "@/modules/shg/views/group-transactions-view";

export const metadata: Metadata = { title: "Transactions · Group · SHG" };

export default async function GroupTransactionsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return (
    <Suspense>
      <GroupTransactionsView groupId={decodeURIComponent(groupId)} />
    </Suspense>
  );
}
