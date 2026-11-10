"use client";

import { NavTabs } from "@/components/navigation/nav-tabs";
import { getProduct } from "@/products/registry";
import type { ProductKey } from "@/products/types";
import { ContextHeader } from "./context-header";
import { ProductMark } from "@/components/brand/product-mark";

/**
 * The product's secondary header under the main console header: the product
 * identity (scrolls away) and its section tabs (stay stuck under the main header).
 */
export function ProductHeader({ product: key, showNavigation = true }: { product: ProductKey; showNavigation?: boolean }) {
  const product = getProduct(key);
  if (!product) return null;
  return (
    <ContextHeader
      identity={
        <div className="flex items-center gap-3.5">
          <ProductMark product={product} size={44} />
          <div className="min-w-0">
            <p className="text-2xl leading-tight font-semibold tracking-[-0.025em] text-foreground">{product.name}</p>
            <p className="mt-0.5 text-sm text-muted">{product.description}</p>
          </div>
        </div>
      }
      navigation={
        showNavigation ? (
          <NavTabs level="product" divider={false} label={`${product.name} sections`} tabs={product.navigation} />
        ) : undefined
      }
    />
  );
}
