import { useCallback, useEffect, useState } from "react";
import type { Page } from "./components/site/Header";

/**
 * Minimal History API router for the three Corporate pages.
 *
 * The site has exactly three views and is served from the domain root, so a
 * routing library would be more moving parts than the site needs. This gives
 * each view a real, shareable, crawlable URL and keeps browser back/forward
 * working, which `useState` alone could not.
 *
 * Direct navigation to /about and /products relies on the SPA rewrite in
 * `vercel.json` — without it the host would 404 before this code ever runs.
 */

const SITE_ORIGIN = "https://ozey.in";

const PATHS: Record<Page, string> = {
  home: "/",
  about: "/about",
  products: "/products",
};

/** Per-route document metadata. A single static <head> cannot describe three
 *  URLs, so title/description/canonical are corrected on navigation. */
const META: Record<Page, { title: string; description: string }> = {
  home: {
    title: "Ozey — Operating system for micro & small businesses",
    description:
      "Ozey is building the operating system for micro and small businesses in India.",
  },
  about: {
    title: "About — Ozey",
    description:
      "The origin, values, and direction of Ozey — how Ozey thinks about building for micro and small businesses.",
  },
  products: {
    title: "Products — Ozey",
    description:
      "The products inside the Ozey ecosystem: Spendrova for subscription intelligence and Ozey SHG for community finance.",
  },
};

export function pathFor(page: Page): string {
  return PATHS[page];
}

export function pageFor(pathname: string): Page {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/about") return "about";
  if (path === "/products") return "products";
  return "home";
}

/** Keeps title, description, canonical and og:url honest per route. */
function applyRouteMeta(page: Page): void {
  const { title, description } = META[page];
  const url = SITE_ORIGIN + PATHS[page];

  document.title = title;

  const set = (selector: string, attr: string, value: string) => {
    const el = document.head.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  set('meta[name="description"]', "content", description);
  set('link[rel="canonical"]', "href", url);
  set('meta[property="og:url"]', "content", url);
  set('meta[property="og:title"]', "content", title);
  set('meta[property="og:description"]', "content", description);
  set('meta[name="twitter:title"]', "content", title);
  set('meta[name="twitter:description"]', "content", description);
}

export function useRoute() {
  const [page, setPage] = useState<Page>(() => pageFor(window.location.pathname));

  useEffect(() => {
    const onPop = () => setPage(pageFor(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    applyRouteMeta(page);
  }, [page]);

  const navigate = useCallback((next: Page) => {
    if (next === pageFor(window.location.pathname)) return;
    window.history.pushState({}, "", PATHS[next]);
    setPage(next);
    window.scrollTo(0, 0);
  }, []);

  return { page, navigate };
}
