"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { RouterProvider } from "react-aria-components";
import { classifyError } from "@/lib/errors";

const BASE_PATH = "/dashboard";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>;
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Firestore reads are billed: cache generously, never refetch on focus.
            staleTime: 2 * 60_000,
            refetchOnWindowFocus: false,
            // Retrying cannot fix rules, missing indexes or missing documents.
            retry: (failureCount, error) =>
              failureCount < 2 && ["unavailable", "unknown"].includes(classifyError(error).kind),
          },
        },
      }),
  );

  return (
    // Lets HeroUI (React Aria) links and table rows navigate client-side.
    <RouterProvider navigate={router.push} useHref={(href) => (href.startsWith("/") ? BASE_PATH + href : href)}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </RouterProvider>
  );
}
