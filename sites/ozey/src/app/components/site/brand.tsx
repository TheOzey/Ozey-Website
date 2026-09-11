import svgPaths from "@/imports/Home/svg-u69mgp2x89";
import imgVector from "@/imports/Home/ae31a256271b1f44039439c491cc95428bee51b7.png";

/* Ozey brand marks. The wordmark and logo geometry come from the brand
   Figma export and must not be redrawn by hand. */

export function OzeyWordmark({ height = 18 }: { height?: number }) {
  const scale = height / 27.49;
  return (
    <span
      style={{ height, width: 75.8 * scale, position: "relative", flexShrink: 0, display: "inline-block" }}
      aria-hidden
    >
      <svg
        className="absolute block inset-0 size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 75.8004 27.4896"
      >
        <path d={svgPaths.p3f1fb700} fill="currentColor" />
        <path clipRule="evenodd" d={svgPaths.p2df68a00} fill="currentColor" fillRule="evenodd" />
        <path clipRule="evenodd" d={svgPaths.p1645b300} fill="currentColor" fillRule="evenodd" />
        <path d={svgPaths.p3ae18480} fill="currentColor" />
        <path d={svgPaths.p28fa5800} fill="currentColor" />
        <path d={svgPaths.p277ab300} fill="currentColor" />
      </svg>
    </span>
  );
}

export function OzeyLogoMark() {
  return (
    <div className="h-[159px] overflow-clip relative shrink-0 w-[160px]" aria-hidden>
      <div className="absolute inset-[23.28%_0.19%_0_23.55%]">
        <svg
          className="absolute block inset-0 size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 122.013 121.978"
        >
          <path d={svgPaths.p384b92c0} fill="var(--text-primary)" />
        </svg>
      </div>
      <div className="absolute inset-[0_23.34%_23.28%_0.4%]">
        <svg
          className="absolute block inset-0 size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 122.013 121.978"
        >
          <path d={svgPaths.p28688d80} fill="var(--text-primary)" />
        </svg>
      </div>
      <div className="absolute inset-[9.6%_0.19%_9.79%_0]">
        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector} />
      </div>
    </div>
  );
}
