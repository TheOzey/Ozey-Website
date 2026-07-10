import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useInView } from "motion/react";
import clsx from "clsx";

/**
 * Reveal — the Flow/Reveal motion family.
 *
 * Content is uncovered by a soft mask (clip + short rise along the locked
 * motion distances), 600–900ms. Once the transition settles, the clip is
 * removed entirely (.done) so children that later lift on hover — cards,
 * their shadows — are never cut by the wrapper's clip box. Under
 * prefers-reduced-motion the hidden state never exists (see home.css) so
 * content simply appears — nothing is withheld.
 */
export function Reveal({
  as,
  className,
  delay = 0,
  children,
  style,
}: {
  as?: ElementType;
  className?: string;
  /** stagger offset in ms */
  delay?: number;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<Element>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, margin: "-12% 0px" });
  const [done, setDone] = useState(false);

  // Fallback in case transitionend doesn't fire: reveal duration is 800ms.
  useEffect(() => {
    if (!inView || done) return;
    const t = window.setTimeout(() => setDone(true), delay + 1000);
    return () => window.clearTimeout(t);
  }, [inView, done, delay]);

  return (
    <Tag
      ref={ref}
      className={clsx("reveal", inView && "in", done && "done", className)}
      style={delay ? { transitionDelay: `${delay}ms`, ...style } : style}
      onTransitionEnd={(e: React.TransitionEvent) => {
        if (e.target === ref.current && e.propertyName.includes("clip-path")) {
          setDone(true);
        }
      }}
    >
      {children}
    </Tag>
  );
}
