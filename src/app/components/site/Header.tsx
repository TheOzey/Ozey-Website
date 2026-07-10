import { useEffect, useState } from "react";
import { OzeyWordmark } from "./brand";
import { VisuallyHidden } from "../primitives";

export type Page = "home" | "about" | "products";

const NAV_ITEMS: Array<{ label: string; page: Page }> = [
  { label: "About", page: "about" },
  { label: "Products", page: "products" },
];

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
        <button
          type="button"
          className="site-header-brand"
          onClick={() => onNav("home")}
          aria-current={page === "home" ? "page" : undefined}
        >
          <OzeyWordmark height={18} />
          <VisuallyHidden>Ozey — home</VisuallyHidden>
        </button>
        <nav className="site-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.page}
              type="button"
              className="site-nav-link"
              aria-current={page === item.page ? "page" : undefined}
              onClick={() => onNav(item.page)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
