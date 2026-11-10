import type { Metadata } from "next";
import { Suspense } from "react";
import { GroupsView } from "@/modules/shg/views/groups-view";

export const metadata: Metadata = { title: "Groups · SHG" };

export default function GroupsPage() {
  return (
    <Suspense>
      <GroupsView />
    </Suspense>
  );
}
