import type { Metadata } from "next";
import { PageContainer } from "@/components/page/page-container";
import { ConsoleHome } from "@/components/shell/console-home";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PageContainer>
      <ConsoleHome />
    </PageContainer>
  );
}
