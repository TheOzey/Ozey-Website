import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsView } from "@/modules/shg/views/reports-view";

export const metadata: Metadata = { title: "Reports · SHG" };

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsView />
    </Suspense>
  );
}
