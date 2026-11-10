"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { PAGE_X } from "@/components/page/page-container";

/** Height of the console's main (top) header; the tab row sticks right below it. */
const MAIN_HEADER_PX = 56;

/**
 * A full-width white band under the main header that sets the page's context
 * (a product, or one record such as a group): a large identity block, then a
 * row of section tabs.
 *
 * Scrolling moves the identity block away while the tab row sticks directly
 * under the main header, so the sections stay one click away. Once the
 * identity has scrolled out, `compactTitle` fades in at the end of the tab
 * row to keep the context visible. Both parts are in normal flow (the tab row
 * is `position: sticky`), so content is pushed down, never covered. On very
 * short viewports the tab row stops sticking to leave room for content.
 *
 * Renders siblings (a fragment), so the sticky row's containing block is the
 * page's main element and it stays stuck for the whole page.
 */
export function ContextHeader({
  identity,
  navigation,
  compactTitle,
}: {
  identity: ReactNode;
  navigation?: ReactNode;
  compactTitle?: ReactNode;
}) {
  const identityRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const el = identityRef.current;
    if (!el || !compactTitle) return;
    const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), {
      rootMargin: `-${MAIN_HEADER_PX}px 0px 0px 0px`,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [compactTitle]);

  return (
    <>
      <div className={`bg-surface ${navigation ? "" : "border-b border-border"}`}>
        <div ref={identityRef} className={`${PAGE_X} pt-6 ${navigation ? "pb-3" : "pb-6"}`}>
          {identity}
        </div>
      </div>
      {navigation ? (
        <div className="sticky top-14 z-10 border-b border-border bg-surface [@media(max-height:480px)]:static">
          <div className={`${PAGE_X} flex items-center gap-6`}>
            <div className="min-w-0 flex-1">{navigation}</div>
            {compactTitle ? (
              <div
                aria-hidden={!collapsed}
                className={`hidden max-w-[40%] truncate text-[13px] font-semibold text-foreground transition-opacity duration-150 sm:block ${
                  collapsed ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                {compactTitle}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
