import Image from "next/image";
import type { ProductDefinition } from "@/products/types";

/**
 * A product's logo as a square tile. The artwork is used as supplied (not
 * redrawn or recoloured); the tile only rounds its corners, scaled to its size.
 * Decorative: the product's name is always shown next to it.
 */
export function ProductMark({ product, size }: { product: ProductDefinition; size: number }) {
  return (
    <Image
      src={product.logo}
      alt=""
      aria-hidden
      width={size}
      height={size}
      sizes={`${size}px`}
      className="shrink-0 object-cover"
      style={{ width: size, height: size, borderRadius: Math.max(3, Math.round(size * 0.22)) }}
    />
  );
}
