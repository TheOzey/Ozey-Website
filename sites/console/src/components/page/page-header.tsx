"use client";

import { Breadcrumbs } from "@heroui/react";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  meta,
  size = "page",
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  meta?: ReactNode;
  /** "section" for a page inside a product, whose header already names the product. */
  size?: "page" | "section";
}) {
  return (
    <header className={size === "page" ? "mb-8" : "mb-6"}>
      {breadcrumbs?.length ? (
        <Breadcrumbs className="mb-3">
          {breadcrumbs.map((crumb) => (
            <Breadcrumbs.Item key={`${crumb.label}:${crumb.href ?? ""}`} href={crumb.href}>
              {crumb.label}
            </Breadcrumbs.Item>
          ))}
        </Breadcrumbs>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1
            className={`truncate leading-tight font-semibold text-foreground ${
              size === "page" ? "text-[26px] tracking-[-0.025em]" : "text-xl tracking-[-0.02em]"
            }`}
          >
            {title}
          </h1>
          {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p> : null}
          {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
