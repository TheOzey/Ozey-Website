import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getConsoleSession } from "@/lib/server/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

/** Only same-app relative paths are honoured, never absolute URLs (open-redirect guard). */
function safeNext(value: string | string[] | undefined): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const session = await getConsoleSession();
  if (session?.state === "active") redirect(next);

  const inactiveReason = session?.state === "inactive" ? session.reason : typeof params.reason === "string" ? params.reason : null;
  return <LoginForm next={next} inactiveReason={inactiveReason} />;
}
