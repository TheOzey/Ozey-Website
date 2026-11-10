import { useEffect, useState } from "react";
import { OzeyWordmark } from "./brand";
import { VisuallyHidden } from "../primitives";
import { pathFor } from "../../router";

export type Page = "home" | "about" | "products";

/* Minimal header: the centered Ozey wordmark only. Navigation into
   About and Products happens through the gateway cards. */
export function Header({ page, onNav }: { page: Page; onNav: (p: Page) => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="container-page site-header-inner">
        <a
          className="site-header-brand"
          href={pathFor("home")}
          onClick={(e) => {
            // Let modified clicks (new tab, download) behave natively.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            onNav("home");
          }}
          aria-current={page === "home" ? "page" : undefined}
        >
          <OzeyWordmark height={18} />
          <VisuallyHidden>Ozey — home</VisuallyHidden>
        </a>
      </div>
    </header>
  );
}
