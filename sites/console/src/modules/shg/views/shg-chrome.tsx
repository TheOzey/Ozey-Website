"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PageContainer } from "@/components/page/page-container";
import { ProductHeader } from "@/components/shell/product-header";
import { isGroupContextPath } from "../navigation";

/**
 * SHG product pages get the SHG header and the standard page body. A group's
 * pages replace both with the group's own header (see GroupShell).
 */
export function ShgChrome({ children }: { children: ReactNode }) {
  if (isGroupContextPath(usePathname())) return <>{children}</>;
  return (
    <>
      <ProductHeader product="shg" />
      <PageContainer>{children}</PageContainer>
    </>
  );
}
