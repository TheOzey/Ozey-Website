"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Page, PageCursor } from "@/lib/pagination";

interface PagerState {
  keyString: string;
  cursors: (PageCursor | null)[];
  pageIndex: number;
}

/**
 * Forward/back pagination over cursor-based pages. Firestore cannot jump to
 * page N without reading pages 1..N-1, so the UI offers Previous / Next and
 * remembers the cursors it has already seen. Changing `queryKey` (e.g. a
 * filter) resets to the first page.
 */
export function useCursorPagination<T>(
  queryKey: readonly unknown[],
  fetchPage: (cursor: PageCursor | null) => Promise<Page<T>>,
) {
  const keyString = JSON.stringify(queryKey);
  const [state, setState] = useState<PagerState>({ keyString, cursors: [null], pageIndex: 0 });
  const current = state.keyString === keyString ? state : { keyString, cursors: [null], pageIndex: 0 };
  if (current !== state) setState(current);

  const query = useQuery({
    queryKey: [...queryKey, "page", current.pageIndex],
    queryFn: () => fetchPage(current.cursors[current.pageIndex] ?? null),
    placeholderData: keepPreviousData,
  });

  const next = query.isPlaceholderData ? null : (query.data?.next ?? null);

  return {
    query,
    items: query.data?.items ?? [],
    pageNumber: current.pageIndex + 1,
    hasPrevious: current.pageIndex > 0,
    hasNext: next !== null,
    goNext: () => {
      if (!next) return;
      setState({
        keyString,
        cursors: [...current.cursors.slice(0, current.pageIndex + 1), next],
        pageIndex: current.pageIndex + 1,
      });
    },
    goPrevious: () => setState({ ...current, pageIndex: Math.max(0, current.pageIndex - 1) }),
  };
}
