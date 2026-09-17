import { useRef } from "react";
import { useInView } from "motion/react";
import clsx from "clsx";

/**
 * Respect Gap — the homepage's strongest signature moment.
 *
 * Only "respect gap" receives the Intelligence Gradient. The gradient
 * travels across the phrase exactly once when the section first becomes
 * active (useInView once: true — it never replays on scroll-back), then
 * settles as static gradient text. Under reduced motion the gradient is
 * present without the travel.
 */
export function RespectGap() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, margin: "-32% 0px" });

  return (
    <section ref={ref} className="section respect">
      <div className="container-page">
        <div className="respect-lines">
          <p className="type-display-section respect-line-quiet">
            This isn&rsquo;t a technology gap.
          </p>
          <p className="type-display-section">
            It&rsquo;s a{" "}
            <span className={clsx("respect-gap-phrase", inView && "is-signaled")}>
              respect gap.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
