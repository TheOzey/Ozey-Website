import type { ReactNode } from "react";

/** Horizontal page bounds, shared by page content and full-width header bands. */
export const PAGE_X = "mx-auto w-full max-w-[1400px] px-4 sm:px-8";

/** The padded, width-limited body of a console page. */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className={`${PAGE_X} py-8`}>{children}</div>;
}
