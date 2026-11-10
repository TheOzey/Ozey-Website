"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { OzeyMark } from "@/components/brand/ozey-mark";
import { Handshake, UsersRound } from "lucide-react";
import { isPathActive } from "@/components/navigation/nav-tabs";
import { PRODUCTS } from "@/products/registry";
import { CONSOLE_NAVIGATION, WORKFORCE_NAVIGATION } from "./console-navigation";
import { ProductMark } from "@/components/brand/product-mark";
function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus",
        active ? "bg-accent/8 font-semibold text-accent" : "font-medium text-foreground/75 hover:bg-default hover:text-foreground",
      ].join(" ")}
    >
      {children}
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
                <NavLink href={href} active={active}>
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
                <NavLink href={href} active={active}>
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
              <NavLink href={product.href} active={isPathActive(pathname, product.href)}>
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
