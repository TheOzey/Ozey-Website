import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ConsoleShell } from "@/components/shell/console-shell";
import { ConsoleSessionProvider } from "@/lib/auth/session-context";
import { getConsoleSession } from "@/lib/server/session";

// Sessions are per request; never prerender or cache authenticated pages.
export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const session = await getConsoleSession();
  if (!session) redirect("/login");
  if (session.state !== "active") redirect(`/login?reason=${session.reason}`);

  const { employee } = session;
  return (
    <ConsoleSessionProvider
      session={{
        email: employee.email,
        displayName: employee.displayName,
        permissions: employee.permissions,
      }}
    >
      <ConsoleShell>{children}</ConsoleShell>
    </ConsoleSessionProvider>
  );
}
