import { useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useInView } from "motion/react";
import clsx from "clsx";

/**
 * Reveal — the Flow/Reveal motion family.
 *
 * Content is uncovered by a soft mask (clip + short rise along the locked
 * motion distances), 600–900ms. Under prefers-reduced-motion the hidden
 * state never exists (see home.css) so content simply appears — nothing
 * is withheld.
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
  return (
    <Tag
      ref={ref}
      className={clsx("reveal", inView && "in", className)}
      style={delay ? { transitionDelay: `${delay}ms`, ...style } : style}
    >
      {children}
    </Tag>
  );
}
