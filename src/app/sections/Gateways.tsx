import { Reveal } from "./Reveal";
import { ArrowUpRightIcon } from "../components/icons";
import type { Page } from "../components/site/Header";

/**
 * Gateways — quiet navigation into About and Products. Deliberately
 * secondary to the product cards: smaller, transparent, restrained.
 */

const GATEWAYS: Array<{ label: string; heading: string; desc: string; target: Page }> = [
  {
    label: "About",
    heading: "How Ozey thinks.",
    desc: "The origin, values, and direction of Ozey.",
    target: "about",
  },
  {
    label: "Products",
    heading: "What Ozey builds.",
    desc: "The products inside the Ozey ecosystem.",
    target: "products",
  },
];

export function Gateways({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <section className="section gateways">
      <div className="container-page">
        <div className="gateways-grid">
          {GATEWAYS.map((g, i) => (
            <Reveal key={g.target} delay={i * 120}>
              <button
                type="button"
                className="gateway-card card-surface card-interactive"
                onClick={() => onNav(g.target)}
              >
                <span className="type-label-md type-label-caps section-label">{g.label}</span>
                <span className="type-heading-lg">{g.heading}</span>
                <span className="type-body-sm gateway-desc">{g.desc}</span>
                <span className="gateway-arrow" aria-hidden>
                  <ArrowUpRightIcon size="inline" />
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
