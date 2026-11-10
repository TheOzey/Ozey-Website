import { EmptyState } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyBlock({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <EmptyState className={`flex flex-col items-center justify-center gap-2 px-6 py-12 text-center ${className}`}>
      <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-default text-muted">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {description ? <span className="max-w-sm text-sm text-muted">{description}</span> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </EmptyState>
  );
}
