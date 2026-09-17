import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ElementType,
  HTMLAttributes,
  ReactNode,
} from "react";
import clsx from "clsx";
import { ArrowUpRightIcon } from "../icons";

/* ═══════════════════════════════════════════════════════════════════════════
   OZEY PRIMITIVES — the reusable building blocks every section composes.
   Visual rules live in styles/primitives.css + tokens.css; these components
   only wire structure, semantics, and accessibility.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Containers ─────────────────────────────────────────────────────────── */

interface BoxProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children?: ReactNode;
}

/** Content column: max 1280px, fluid page gutters, centered. */
export function PageContainer({ as: Tag = "div", className, ...rest }: BoxProps) {
  return <Tag className={clsx("container-page", className)} {...rest} />;
}

/** Full-width section band with cinematic block padding. */
export function Section({ as: Tag = "section", className, ...rest }: BoxProps) {
  return <Tag className={clsx("section", className)} {...rest} />;
}

/** Reading column: max 720px for body copy. */
export function ReadingContainer({ as: Tag = "div", className, ...rest }: BoxProps) {
  return <Tag className={clsx("container-reading", className)} {...rest} />;
}

/* ── Typography ─────────────────────────────────────────────────────────── */

type TypeLevel =
  | "display-hero"
  | "display-section"
  | "heading-xl"
  | "heading-lg"
  | "heading-md"
  | "body-lg"
  | "body-md"
  | "body-sm"
  | "label-md"
  | "label-sm"
  | "mono";

type TextTone = "primary" | "secondary" | "tertiary" | "muted";

const TONE_VAR: Record<TextTone, string> = {
  primary: "var(--text-primary)",
  secondary: "var(--text-secondary)",
  tertiary: "var(--text-tertiary)",
  muted: "var(--text-muted)",
};

interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  level: TypeLevel;
  tone?: TextTone;
  children?: ReactNode;
}

/** Typography primitive — one of the ten locked type levels + slate tone. */
export function Text({
  as: Tag = "p",
  level,
  tone,
  className,
  style,
  ...rest
}: TextProps) {
  return (
    <Tag
      className={clsx(`type-${level}`, className)}
      style={tone ? { color: TONE_VAR[tone], ...style } : style}
      {...rest}
    />
  );
}

/** Intelligence-gradient text — one phrase per section, never paragraphs. */
export function GradientText({
  as: Tag = "span",
  className,
  ...rest
}: BoxProps) {
  return <Tag className={clsx("gradient-text", className)} {...rest} />;
}

/* ── Controls ───────────────────────────────────────────────────────────── */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

/** Primary CTA: pill, 44px, warm-white text, gradient signal border on
    hover/focus only. Never a filled gradient button. */
export function Button({ className, ...rest }: ButtonProps) {
  return (
    <button className={clsx("button-primary", "signal-border", className)} {...rest} />
  );
}

interface TextLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode;
  /** Render as a button (SPA navigation) instead of an anchor. */
  asButton?: boolean;
  onActivate?: () => void;
}

/** Secondary CTA: text + arrow, arrow travels 4px along the slash angle. */
export function TextLink({
  children,
  className,
  asButton,
  onActivate,
  ...rest
}: TextLinkProps) {
  const content = (
    <>
      {children}
      <span className="text-link-arrow" aria-hidden>
        <ArrowUpRightIcon size="inline" />
      </span>
    </>
  );
  if (asButton) {
    return (
      <button
        type="button"
        className={clsx("text-link", className)}
        onClick={onActivate}
      >
        {content}
      </button>
    );
  }
  return (
    <a className={clsx("text-link", className)} {...rest}>
      {content}
    </a>
  );
}

interface IconButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Accessible name — required; icon-only controls must be labelled. */
  label: string;
  children: ReactNode;
}

/** Icon-only link with a 44px hit area and mandatory aria-label. */
export function IconLink({ label, children, className, ...rest }: IconButtonProps) {
  return (
    <a className={clsx("icon-button", className)} aria-label={label} {...rest}>
      {children}
    </a>
  );
}

/* ── Surfaces ───────────────────────────────────────────────────────────── */

interface CardSurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** product = 32px radius + resting shadow; gateway = 24px radius. */
  variant?: "product" | "gateway";
  /** Adds hover lift, border strengthen, surface elevate. */
  interactive?: boolean;
  children?: ReactNode;
}

/** Neutral card surface. Depth comes from surface contrast + border, not
    heavy shadows. Gradient never appears on the surface itself. */
export function CardSurface({
  as: Tag = "div",
  variant = "gateway",
  interactive,
  className,
  ...rest
}: CardSurfaceProps) {
  return (
    <Tag
      className={clsx(
        "card-surface",
        variant === "product" && "card-surface-product",
        interactive && "card-interactive",
        className,
      )}
      {...rest}
    />
  );
}

interface ProductCardShellProps extends HTMLAttributes<HTMLDivElement> {
  index: string;
  name: string;
  tagline: string;
  supporting?: ReactNode;
  /** Large preview area — occupies 50–60% of the card height. */
  preview: ReactNode;
  /** Minimal navigation control (e.g. a TextLink). */
  control?: ReactNode;
}

/** The locked product-card structure: index / name / one-liner / optional
    copy / large preview / minimal control. A gateway, not a dashboard. */
export function ProductCardShell({
  index,
  name,
  tagline,
  supporting,
  preview,
  control,
  className,
  ...rest
}: ProductCardShellProps) {
  return (
    <CardSurface
      variant="product"
      interactive
      className={clsx("focus-item", className)}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "min(520px, 100%)",
        minHeight: 620,
        padding: "var(--space-10)",
        overflow: "hidden",
      }}
      {...rest}
    >
      <Text level="mono" tone="tertiary" as="span">
        {index}
      </Text>
      <Text level="heading-lg" as="h3" style={{ marginTop: "var(--space-4)" }}>
        {name}
      </Text>
      <Text
        level="body-md"
        tone="secondary"
        style={{ marginTop: "var(--space-2)" }}
      >
        {tagline}
      </Text>
      {supporting ? (
        <Text
          level="body-sm"
          tone="tertiary"
          as="div"
          style={{ marginTop: "var(--space-4)" }}
        >
          {supporting}
        </Text>
      ) : null}
      <div
        style={{
          flex: 1,
          minHeight: "50%",
          marginTop: "var(--space-8)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        {preview}
      </div>
      {control ? <div style={{ marginTop: "var(--space-6)" }}>{control}</div> : null}
    </CardSurface>
  );
}

/* ── Utilities ──────────────────────────────────────────────────────────── */

/** Screen-reader-only content. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="visually-hidden">{children}</span>;
}
