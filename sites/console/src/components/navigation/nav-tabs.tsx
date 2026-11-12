"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { SPRING_SWAP } from "@/lib/ease";

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
 * Route-backed horizontal navigation with a beUI-style spring underline.
 * Real links (back/forward, refresh, open-in-new-tab) stay intact; motion is
 * limited to the active indicator (respects reduced motion).
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
  const layoutId = useId();
  const reduceMotion = useReducedMotion();

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
            <li key={tab.href} className="relative flex">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  divider ? "-mb-px" : "",
                  "relative flex items-center font-medium whitespace-nowrap transition-colors outline-none",
                  "focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset",
                  level === "product" ? "h-11 text-sm" : "h-10 text-[13px]",
                  active ? "text-accent" : "text-muted hover:text-foreground",
                ].join(" ")}
              >
                {tab.label}
                {active ? (
                  reduceMotion ? (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" aria-hidden />
                  ) : (
                    <motion.span
                      layoutId={`nav-tabs-underline-${layoutId}`}
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                      transition={SPRING_SWAP}
                      aria-hidden
                    />
                  )
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
