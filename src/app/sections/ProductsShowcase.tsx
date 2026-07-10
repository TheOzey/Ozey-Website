import type { MouseEvent } from "react";
import clsx from "clsx";
import imgSpendrova from "@/imports/Home/136acd2f9d0909776c4d8b9fa51cd10bf1b46c45.png";
import imgShg from "@/imports/Home/f17080a405b7aa37734d6ab8ec737252bef2ec38.png";
import { Reveal } from "./Reveal";
import { ArrowUpRightIcon } from "../components/icons";
import type { Page } from "../components/site/Header";

/**
 * Products — proof of the infrastructure. Two portrait editorial cards
 * matching the locked Figma pattern: product name, muted platform line,
 * three benefit lines, a large free-floating preview in the lower half,
 * and a circular arrow control pinned bottom-right. Each card is one
 * keyboard-accessible link. Hover stays quiet and physical: 4px lift,
 * slightly brighter border, deeper shadow, preview scales to 1.02,
 * arrow nudges along the slash angle, sibling quiets to 88%.
 *
 * Each card links to its product's live destination.
 */

const PRODUCT_URLS: Record<string, string | null> = {
  Spendrova: "https://spendrova.com",
  "Ozey SHG": "https://shg.ozey.in",
};

const PRODUCTS = [
  {
    name: "Spendrova",
    platform: "Subscription Intelligence Platform",
    lines: [
      "Know every recurring payment.",
      "Never miss a renewal.",
      "Savings that happen automatically.",
    ],
    image: imgSpendrova,
  },
  {
    name: "Ozey SHG",
    platform: "Community Finance",
    lines: ["Savings groups, organized.", "Member meeting records.", "Loans tracked."],
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
        "product-card focus-item",
      )}
      href={href ?? "#products"}
      onClick={handleClick}
      aria-label={`${product.name} — ${product.platform}`}
      {...(href ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <h3 className="type-heading-lg">{product.name}</h3>
      <p className="type-body-md product-platform">{product.platform}</p>
      <ul className="product-lines" role="list">
        {product.lines.map((line) => (
          <li key={line} className="type-body-lg">
            {line}
          </li>
        ))}
      </ul>
      <div className="product-preview">
        <img src={product.image} alt={`${product.name} app preview`} loading="lazy" />
      </div>
      <span className="product-cta" aria-hidden>
        <ArrowUpRightIcon size="cardAction" />
      </span>
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
