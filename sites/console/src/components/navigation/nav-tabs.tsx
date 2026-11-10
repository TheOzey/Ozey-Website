"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export interface NavTab {
  label: string;
  href: string;
  /** Active only on the exact href (an overview route), not its children. */
  exact?: boolean;
}

export function isPathActive(pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Route-backed horizontal navigation: real links (so back/forward, refresh and
 * open-in-new-tab work), an accent underline under the current label, and a
 * hairline divider. Used at two levels:
 *   "product"  — a product's sections (SHG: Overview · Groups · Reports)
 *   "section"  — one record's sections (a group: Overview · Members · …),
 *                one step smaller so it reads as the level below.
 * On narrow screens the strip scrolls sideways on its own (never the page)
 * and keeps the active tab in view.
 */
export function NavTabs({
  label,
  tabs,
  level = "product",
  divider = true,
}: {
  label: string;
  tabs: readonly NavTab[];
  level?: "product" | "section";
  /** Draw the hairline under the strip. Off when the container already draws a full-width one. */
  divider?: boolean;
}) {
  const pathname = usePathname();
  const scroller = useRef<HTMLElement>(null);

  useEffect(() => {
    const strip = scroller.current;
    const active = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !active || strip.scrollWidth <= strip.clientWidth) return;
    const left = active.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + active.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = Math.max(0, left - 16);
    }
  }, [pathname]);

  return (
    <nav
      ref={scroller}
      aria-label={label}
      className={`overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${divider ? "border-b border-border" : ""}`}
    >
      <ul className={`flex min-w-max items-stretch ${level === "product" ? "gap-7" : "gap-6"}`}>
        {tabs.map((tab) => {
          const active = isPathActive(pathname, tab.href, tab.exact);
          return (
            <li key={tab.href} className="flex">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  divider ? "-mb-px" : "",
                  "flex items-center border-b-2 font-medium whitespace-nowrap transition-colors outline-none",
                  "focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset",
                  level === "product" ? "h-11 text-sm" : "h-10 text-[13px]",
                  active ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
