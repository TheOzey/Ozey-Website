import type { StaticImageData } from "next/image";

/** Products the console currently serves. Add a key here when a product is added. */
export type ProductKey = "shg";

/** A product-level section, shown as a tab in the product header. */
export interface ProductNavItem {
  label: string;
  /** Route relative to the console root, e.g. "/shg/groups". */
  href: string;
  /** Matches only the exact href (used for a product's overview route). */
  exact?: boolean;
}

export interface ProductDefinition {
  key: ProductKey;
  name: string;
  /** The product's logo, shown wherever the product is named in the console. */
  logo: StaticImageData;
  /** One line shown under the product name in its header. */
  description: string;
  href: string;
  navigation: ProductNavItem[];
  /**
   * Where the main header's back button leads on this pathname, if anywhere
   * (e.g. a group's pages lead back to Groups). Null shows no back button.
   */
  backLink?: (pathname: string) => { label: string; href: string } | null;
}
