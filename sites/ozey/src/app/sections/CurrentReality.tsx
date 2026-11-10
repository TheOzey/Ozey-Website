import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Reveal } from "./Reveal";

const TOOLS = [
  "Notebook.",
  "Calls.",
  "Memory.",
  "WhatsApp.",
  "Registers.",
  "Manual coordination.",
];

/**
 * Current Reality — systems becoming visible.
 *
 * The list pins while the section scrolls; words activate one by one:
 * muted slate → warm white with one brief signal pass → settled slate.
 * Activation is monotonic (never rewinds) — understanding doesn't undo.
 */
export function CurrentReality() {
  const ref = useRef<HTMLElement>(null);
  const [activated, setActivated] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let max = 0;
    const onScroll = () => {
      const { top, height } = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const span = height - vh;
      if (span <= 0) return;
      const progress = Math.max(0, Math.min(1, -top / span));
      const count = Math.min(TOOLS.length, Math.floor(progress * (TOOLS.length + 1.4)));
      if (count > max) {
        max = count;
        setActivated(count);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section ref={ref} className="section reality">
      <div className="container-page reality-sticky">
        <Reveal>
          <span className="type-label-md type-label-caps section-label">The reality</span>
        </Reveal>
        <ul className="reality-list" role="list">
          {TOOLS.map((word, i) => (
            <li
              key={word}
              data-text={word}
              className={clsx(
                "reality-word type-display-section",
                i === activated - 1 && "is-active",
                i < activated - 1 && "is-settled",
              )}
            >
              {word}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
