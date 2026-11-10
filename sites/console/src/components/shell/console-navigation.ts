import { LayoutGrid, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Console-level sections. Product navigation lives in each product's header. */
export const CONSOLE_NAVIGATION: { label: string; href: string; icon: LucideIcon; exact?: boolean }[] = [
  { label: "Dashboard", href: "/", icon: LayoutGrid, exact: true },
  { label: "Roles", href: "/roles", icon: ShieldCheck },
];

export const WORKFORCE_NAVIGATION: { label: string; href: string }[] = [
  { label: "Employees", href: "/employees" },
  { label: "Partners", href: "/partners" },
];
