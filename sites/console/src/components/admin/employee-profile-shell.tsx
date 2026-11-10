"use client";

import { Chip } from "@heroui/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageContainer } from "@/components/page/page-container";
import { ContextHeader } from "@/components/shell/context-header";
import { employeeRoutes } from "@/lib/employees/navigation";
import type { EmployeeProfile } from "@/lib/server/employee-profile";

const STATUS_COLOR = { active: "success", invited: "accent", suspended: "warning", offboarded: "default" } as const;

export function EmployeeProfileShell({
  profile,
  children,
}: {
  profile: EmployeeProfile;
  children: ReactNode;
}) {
  const routes = employeeRoutes(profile.employeeNumber);

  return (
    <>
      <ContextHeader
        identity={
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl leading-tight font-semibold tracking-[-0.025em] text-foreground">
                {profile.displayName}
              </h1>
              <p className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-2 text-sm text-muted">
                <span className="font-mono text-foreground">{profile.employeeNumber}</span>
                <span aria-hidden>·</span>
                <span>{profile.email}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip size="sm" variant="soft" color={STATUS_COLOR[profile.status as keyof typeof STATUS_COLOR] ?? "default"} className="capitalize">
                {profile.status}
              </Chip>
              {profile.status !== "offboarded" ? (
                <Link href={routes.edit} className="button button--secondary button--sm">
                  Edit
                </Link>
              ) : null}
            </div>
          </div>
        }
        compactTitle={profile.displayName}
      />
      <PageContainer>{children}</PageContainer>
    </>
  );
}
