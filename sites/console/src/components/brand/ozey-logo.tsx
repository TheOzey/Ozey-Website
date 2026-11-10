import Image from "next/image";
import { OZEY_PATHS } from "./ozey-brand-paths";
import slash from "./ozey-mark-slash.png";

/*
 * Official OZEY brand marks, rendered exactly as the corporate site renders
 * them (sites/ozey/src/app/components/site/brand.tsx): same geometry, same
 * viewBoxes and insets, scaled to the requested size. Never redrawn. The ring
 * and wordmark take the current text colour; the slash is the brand gradient
 * image.
 */

/** The OZEY logo mark (ring + gradient slash). `size` is its width in px. */
export function OzeyLogoMark({ size = 24 }: { size?: number }) {
  // The source artboard is 160 × 159.
  return (
    <span className="relative inline-block shrink-0 overflow-clip" style={{ width: size, height: (size * 159) / 160 }} aria-hidden>
      <span className="absolute" style={{ inset: "23.28% 0.19% 0 23.55%" }}>
        <svg className="absolute inset-0 block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 122.013 121.978">
          <path d={OZEY_PATHS.p384b92c0} fill="currentColor" />
        </svg>
      </span>
      <span className="absolute" style={{ inset: "0 23.34% 23.28% 0.4%" }}>
        <svg className="absolute inset-0 block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 122.013 121.978">
          <path d={OZEY_PATHS.p28688d80} fill="currentColor" />
        </svg>
      </span>
      <span className="absolute" style={{ inset: "9.6% 0.19% 9.79% 0" }}>
        <Image src={slash} alt="" fill sizes={`${size}px`} className="block max-w-none" priority />
      </span>
    </span>
  );
}

/** The OZEY wordmark. `height` in px; width follows the brand proportions. */
export function OzeyWordmark({ height = 18 }: { height?: number }) {
  const scale = height / 27.49;
  return (
    <span className="relative inline-block shrink-0" style={{ height, width: 75.8 * scale }} aria-hidden>
      <svg className="absolute inset-0 block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 75.8004 27.4896">
        <path d={OZEY_PATHS.p3f1fb700} fill="currentColor" />
        <path clipRule="evenodd" d={OZEY_PATHS.p2df68a00} fill="currentColor" fillRule="evenodd" />
        <path clipRule="evenodd" d={OZEY_PATHS.p1645b300} fill="currentColor" fillRule="evenodd" />
        <path d={OZEY_PATHS.p3ae18480} fill="currentColor" />
        <path d={OZEY_PATHS.p28fa5800} fill="currentColor" />
        <path d={OZEY_PATHS.p277ab300} fill="currentColor" />
      </svg>
    </span>
  );
}
