"use client";

import { Handshake, UsersRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useId } from "react";
import { OzeyMark } from "@/components/brand/ozey-mark";
import { ProductMark } from "@/components/brand/product-mark";
import { isPathActive } from "@/components/navigation/nav-tabs";
import { SPRING_LAYOUT } from "@/lib/ease";
import { PRODUCTS } from "@/products/registry";
import { CONSOLE_NAVIGATION, WORKFORCE_NAVIGATION } from "./console-navigation";

function NavLink({
  href,
  active,
  layoutId,
  reduceMotion,
  children,
}: {
  href: string;
  active: boolean;
  layoutId: string;
  reduceMotion: boolean | null;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus",
        active ? "font-semibold text-accent" : "font-medium text-foreground/75 hover:text-foreground",
      ].join(" ")}
    >
      {active ? (
        reduceMotion ? (
          <span className="absolute inset-0 rounded-lg bg-accent/8" aria-hidden />
        ) : (
          <motion.span
            layoutId={layoutId}
            className="absolute inset-0 rounded-lg bg-accent/8"
            transition={SPRING_LAYOUT}
            aria-hidden
          />
        )
      ) : (
        <span className="absolute inset-0 rounded-lg opacity-0 transition-colors group-hover:bg-default group-hover:opacity-100" aria-hidden />
      )}
      <span className="relative z-[1] flex min-w-0 items-center gap-2.5">{children}</span>
    </Link>
  );
}

const WORKFORCE_ICONS = {
  "/employees": UsersRound,
  "/partners": Handshake,
} as const;

/** Console-level navigation only. Each product navigates within its own header. */
export function SidebarNav() {
  const pathname = usePathname();
  const layoutId = `sidebar-active-${useId()}`;
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-5">
        <Link href="/" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <OzeyMark subtitle="Console" />
        </Link>
      </div>

      <nav aria-label="Console" className="flex-1 overflow-y-auto px-3 pt-4 pb-6">
        <ul className="space-y-0.5">
          {CONSOLE_NAVIGATION.map(({ label, href, icon: Icon, exact }) => {
            const active = isPathActive(pathname, href, exact);
            return (
              <li key={href}>
                <NavLink href={href} active={active} layoutId={layoutId} reduceMotion={reduceMotion}>
                  <Icon className={`size-4 shrink-0 ${active ? "text-accent" : "text-muted group-hover:text-foreground"}`} aria-hidden />
                  <span className="truncate">{label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 mb-2 px-2.5 text-[11px] font-semibold tracking-[0.08em] text-muted">PEOPLE &amp; WORKFORCE</div>
        <ul className="space-y-0.5">
          {WORKFORCE_NAVIGATION.map(({ label, href }) => {
            const Icon = WORKFORCE_ICONS[href as keyof typeof WORKFORCE_ICONS];
            const active = isPathActive(pathname, href);
            return (
              <li key={href}>
                <NavLink href={href} active={active} layoutId={layoutId} reduceMotion={reduceMotion}>
                  <Icon className={`size-4 shrink-0 ${active ? "text-accent" : "text-muted group-hover:text-foreground"}`} aria-hidden />
                  <span className="truncate">{label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 mb-2 px-2.5 text-[11px] font-semibold tracking-[0.08em] text-muted">PRODUCTS</div>
        <ul className="space-y-0.5">
          {PRODUCTS.map((product) => (
            <li key={product.key}>
              <NavLink href={product.href} active={isPathActive(pathname, product.href)} layoutId={layoutId} reduceMotion={reduceMotion}>
                <ProductMark product={product} size={18} />
                <span className="truncate">{product.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-border px-5 py-3 text-[11px] text-muted">Internal</div>
    </div>
  );
}
