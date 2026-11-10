import { OzeyLogoMark, OzeyWordmark } from "./ozey-logo";

/** Console lockup: official OZEY mark + wordmark, with an optional product label. */
export function OzeyMark({ subtitle }: { subtitle?: string }) {
  return (
    <span className="flex items-center gap-2.5 text-foreground select-none">
      <OzeyLogoMark size={22} />
      <OzeyWordmark height={13} />
      <span className="sr-only">OZEY</span>
      {subtitle ? <span className="text-[13px] font-medium text-muted">{subtitle}</span> : null}
    </span>
  );
}
