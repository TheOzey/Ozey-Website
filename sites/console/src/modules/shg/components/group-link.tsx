"use client";

import { Link, Skeleton } from "@heroui/react";
import { shgRoutes } from "../navigation";

/** Group name for collection-group rows that only carry a groupId. */
export function GroupLink({ groupId, names, isLoading }: { groupId: string; names?: Record<string, string>; isLoading?: boolean }) {
  if (isLoading && !names) return <Skeleton className="h-3.5 w-24 rounded-md" />;
  return (
    <Link href={shgRoutes.group(groupId)} className="text-sm text-foreground no-underline hover:underline">
      {names?.[groupId] ?? "Unknown group"}
    </Link>
  );
}
