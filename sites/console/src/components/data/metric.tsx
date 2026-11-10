"use client";

import { Skeleton, Tooltip } from "@heroui/react";
import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { classifyError } from "@/lib/errors";

/**
 * One headline figure. Each metric loads and fails independently, so a
 * single missing index never blanks the whole overview.
 */
export function Metric({
  label,
  value,
  hint,
  isPending,
  error,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  isPending: boolean;
  error: unknown;
}) {
  return (
    <div className="min-w-0 px-5 py-4">
      <div className="text-[12px] font-medium tracking-[0.02em] text-muted">{label}</div>
      <div className="mt-1.5 flex h-8 items-center text-[24px] leading-none font-semibold tracking-[-0.02em] text-foreground tabular">
        {isPending ? (
          <Skeleton className="h-6 w-28 rounded-md" />
        ) : error ? (
          <Tooltip delay={0}>
            <Tooltip.Trigger aria-label="Why is this unavailable?">
              <span className="flex items-center gap-1.5 text-sm font-medium text-danger">
                <CircleAlert className="size-4" aria-hidden />
                Unavailable
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content className="max-w-xs">{describe(error)}</Tooltip.Content>
          </Tooltip>
        ) : (
          value
        )}
      </div>
      {hint && !isPending && !error ? <div className="mt-1.5 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

function describe(error: unknown): string {
  const { kind } = classifyError(error);
  if (kind === "permission-denied") return "Firestore rules denied this read. Staff access has not been granted.";
  if (kind === "missing-index") return "A Firestore index required for this figure has not been created.";
  if (kind === "unavailable") return "Firestore could not be reached.";
  return "This figure could not be loaded.";
}

/** A row of metrics sharing one bordered surface, divided rather than boxed. */
export function MetricStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x [&>*:nth-child(n+3)]:sm:border-t [&>*:nth-child(n+3)]:sm:border-border [&>*:nth-child(n+3)]:lg:border-t-0 [&>*:nth-child(even)]:sm:border-l [&>*:nth-child(even)]:sm:border-border [&>*:nth-child(even)]:lg:border-l-0">
      {children}
    </div>
  );
}
