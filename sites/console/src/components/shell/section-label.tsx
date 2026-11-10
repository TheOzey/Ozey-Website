"use client";

import { usePathname } from "next/navigation";
import { isPathActive } from "@/components/navigation/nav-tabs";
import { PRODUCTS } from "@/products/registry";
import { CONSOLE_NAVIGATION } from "./console-navigation";

/** The top-level section the current page belongs to (Dashboard, Employees, Roles or a product). */
export function SectionLabel() {
  const pathname = usePathname();
  const label =
    PRODUCTS.find((p) => isPathActive(pathname, p.href))?.name ??
    CONSOLE_NAVIGATION.find((item) => isPathActive(pathname, item.href, item.exact))?.label;
  return label ? <span className="px-2 text-sm font-semibold text-foreground">{label}</span> : null;
}
