"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRODUCTS } from "@/products/registry";
import { SectionLabel } from "./section-label";

/**
 * Left side of the main header: a back button where the page defines one
 * (a group's pages → Groups), otherwise the current section's name.
 */
export function HeaderLead() {
  const pathname = usePathname();
  const back = PRODUCTS.map((p) => p.backLink?.(pathname)).find(Boolean);
  if (!back) return <SectionLabel />;
  return (
    <Link
      href={back.href}
      data-nav="back"
      className="-ml-1 inline-flex h-8 items-center gap-1 rounded-md pr-2.5 pl-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-default focus-visible:ring-2 focus-visible:ring-focus"
    >
      <ChevronLeft className="size-4 text-muted" aria-hidden />
      {back.label}
    </Link>
  );
}
