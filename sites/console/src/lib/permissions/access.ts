import type { ProductKey } from "@/products/types";
import { hasPermission } from "./permissions";

/**
 * Which product workspaces the console *shows*. This is UI only: each
 * product's own backend independently enforces the same permission on every
 * data request.
 */
export function canAccessProduct(permissions: readonly string[], product: ProductKey): boolean {
  return hasPermission(permissions, `${product}:read`);
}
