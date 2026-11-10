import shgLogo from "@/modules/shg/assets/shg-logo.png";
import { isGroupContextPath, shgNavigation, shgRoutes } from "@/modules/shg/navigation";
import type { ProductDefinition, ProductKey } from "./types";

/**
 * The products the console serves. Only SHG for now. Adding a product means
 * adding its module under src/modules/<key>, its routes under
 * src/app/(console)/<key>, its key in ProductKey, and an entry here. Products
 * that are not live are not listed anywhere in the UI.
 */
export const PRODUCTS: ProductDefinition[] = [
  {
    key: "shg",
    name: "SHG",
    // Supplied SHG logo artwork (512×512, opaque), used as-is; sha256 c1fdf15f2d7fb674….
    logo: shgLogo,
    description: "Self Help Group operations.",
    href: "/shg",
    navigation: shgNavigation,
    backLink: (pathname) => (isGroupContextPath(pathname) ? { label: "Groups", href: shgRoutes.groups } : null),
  },
];

export function getProduct(key: ProductKey): ProductDefinition | undefined {
  return PRODUCTS.find((product) => product.key === key);
}

/** Resolves which product a console pathname belongs to, if any. */
export function productForPath(pathname: string): ProductDefinition | undefined {
  return PRODUCTS.find((product) => pathname === product.href || pathname.startsWith(`${product.href}/`));
}
