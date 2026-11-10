import type { ReactNode } from "react";

/**
 * A bordered section of a page. Deliberately plain (no shadow, no card
 * chrome) so pages read as one surface with sections, not a wall of cards.
 */
export function Panel({
  title,
  description,
  actions,
  children,
  className = "",
  flush = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Remove body padding (for tables that run edge to edge). */
  flush?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-surface ${className}`}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div>
            {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}
