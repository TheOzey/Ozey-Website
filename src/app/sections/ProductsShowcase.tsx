import type { MouseEvent } from "react";
import clsx from "clsx";
import imgSpendrova from "@/imports/Home/136acd2f9d0909776c4d8b9fa51cd10bf1b46c45.png";
import imgShg from "@/imports/Home/f17080a405b7aa37734d6ab8ec737252bef2ec38.png";
import { Reveal } from "./Reveal";
import { ArrowUpRightIcon } from "../components/icons";
import type { Page } from "../components/site/Header";

/**
 * Products — proof of the infrastructure. Two gateway cards with the
 * locked geometry; each is one link, keyboard accessible, with the
 * locked hover choreography (lift 4px, border strengthens, shadow
 * deepens, preview 1.02, arrow travels, sibling quiets to 88%, one
 * brief gradient signal on the border).
 *
 * Each card links to its product's live destination.
 */

const PRODUCT_URLS: Record<string, string | null> = {
  Spendrova: "https://spendrova.com",
  "Ozey SHG": "https://shg.ozey.in",
};

const PRODUCTS = [
  {
    index: "01",
    name: "Spendrova",
    tagline: "Clarity for recurring spending.",
    supporting: "See subscriptions, renewals and recurring costs in one focused view.",
    image: imgSpendrova,
  },
  {
    index: "02",
    name: "Ozey SHG",
    tagline: "Simple systems for community-led finance.",
    supporting:
      "Manage members, savings, meetings, loans and records without changing how the group already works.",
    image: imgShg,
  },
];

function ProductCard({
  product,
  onNav,
}: {
  product: (typeof PRODUCTS)[number];
  onNav: (p: Page) => void;
}) {
  const href = PRODUCT_URLS[product.name];
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!href) {
      e.preventDefault();
      onNav("products");
    }
  };
  return (
    <a
      className={clsx(
        "card-surface card-surface-product card-interactive",
        "product-card focus-item signal-border",
      )}
      href={href ?? "#products"}
      onClick={handleClick}
      {...(href ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <div className="product-card-head">
        <span className="type-mono product-index">{product.index}</span>
        <span className="product-arrow" aria-hidden>
          <ArrowUpRightIcon size="cardAction" />
        </span>
      </div>
      <h3 className="type-heading-lg">{product.name}</h3>
      <p className="type-body-md product-tagline">{product.tagline}</p>
      <p className="type-body-sm product-supporting">{product.supporting}</p>
      <div className="product-preview">
        <img src={product.image} alt={`${product.name} app preview`} loading="lazy" />
      </div>
    </a>
  );
}

export function ProductsShowcase({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <section className="section products" id="products-showcase">
      <div className="container-page">
        <Reveal>
          <span className="type-label-md type-label-caps section-label">Products</span>
        </Reveal>
        <Reveal as="h2" delay={120} className="type-heading-xl products-heading">
          Focused systems, built for real work.
        </Reveal>
        <Reveal delay={220}>
          <p className="type-body-lg products-support">
            Two products today. More taking shape carefully.
          </p>
        </Reveal>
        <div className="products-grid focus-group">
          {PRODUCTS.map((p, i) => (
            <Reveal key={p.name} delay={i * 140}>
              <ProductCard product={p} onNav={onNav} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
