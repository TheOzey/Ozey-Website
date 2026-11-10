"use client";

import { Chip, Link } from "@heroui/react";
import { PageHeader } from "@/components/page/page-header";
import { Panel } from "@/components/page/panel";
import { useConsoleSession } from "@/lib/auth/session-context";
import { canAccessProduct } from "@/lib/permissions/access";
import { PRODUCTS } from "@/products/registry";
import { ProductMark } from "@/components/brand/product-mark";

export function ConsoleHome() {
  const { permissions } = useConsoleSession();
  return (
    <>
      <PageHeader title="Ozey Console" description="Operational visibility across Ozey products. Everything here is read-only." />
      <Panel title="Products" flush>
        <ul className="divide-y divide-border">
          {PRODUCTS.map((product) => {
            const open = canAccessProduct(permissions, product.key);
            return (
              <li key={product.key} className="flex items-center gap-4 px-5 py-4">
                <span className={`flex shrink-0 ${open ? "" : "opacity-50 grayscale"}`}>
                  <ProductMark product={product} size={36} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold ${open ? "text-foreground" : "text-muted"}`}>{product.name}</div>
                  {product.description ? <div className="text-sm text-muted">{product.description}</div> : null}
                </div>
                {open ? (
                  <Link href={product.href} className="text-sm font-medium">
                    Open workspace
                    <Link.Icon />
                  </Link>
                ) : (
                  <Chip size="sm" variant="soft" color="warning">
                    No access
                  </Chip>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
