# Phase 1 Audit — website-v2 Foundation

Snapshot of the branch **before** implementing Ozey Design System v1.0.
Every finding below was verified by reading the files, not assumed.

## Architecture

- **Stack:** Vite 6 + React 18 + TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Motion (Framer Motion successor), pnpm workspace.
- **Entry:** `src/main.tsx` → `src/app/App.tsx`. All three pages (home / about / products) and every section live in **one 634-line file** with state-based routing (`useState<Page>`), no URL routing.
- **Styles:** `src/styles/index.css` imports `fonts.css` → `tailwind.css` → `theme.css`. Nearly all real styling is **inline `style={}` objects** in `App.tsx`; Tailwind is used only for layout utilities.
- **No `tsconfig.json`** — Vite transpiles TS without any type-checking.
- **No lint config, no tests.**

## Token system (current)

`src/styles/theme.css` is the **stock shadcn/ui light theme** (oklch chart colors,
sidebar tokens, `--background: #000000` as the only edit). It exists to serve
48 shadcn components that the app never imports. There is **no Ozey token
source** — every real design decision is hardcoded in `App.tsx`:

| Hardcoded value | Where | Conflict with locked system |
| --- | --- | --- |
| `BG = "#000000"` | App.tsx | Canvas must be `#050607`, never pure black |
| `MUTED = "#334155"` | App.tsx | Not in the slate palette (`#4C5664`/`#7C8796`) |
| `BLUE = "#1868DB"` | About/Products pages | Old blue-only brand styling — not an Ozey color |
| `GRADIENT` 90deg, 4 stops (`#FBAF2C→#32C5FF→#D33DFF→#FE3A6E`) | GText everywhere | Locked gradient is **135deg, 6 stops**; gradient applied to every section label = decoration, not signal |
| Radii `35, 34, 50, 30, 20px` | cards | Locked scale: 10/16/24/32/44/999 |
| Shadows `0 24px 64px .45`, `0 40px 100px .65` | product cards | Locked: `0 24px 80px .28` / `0 32px 100px .40` |
| Borders `rgba(255,255,255, .05–.2)` | everywhere | Locked: slate-based `rgba(148,163,184, .10/.16/.26)` |
| Letter-spacing `-1.68px`, `-1.08px`, `-0.66px` | headings | Locked: em-based (`-0.025em`) |
| Arbitrary spacing (`py-14`, `padding: 100px 46px`, `minHeight: 884`) | sections | Locked: 4px scale + section rhythm tokens |

## Fonts

- `fonts.css` loads **Inter from Google Fonts** (render-blocking, layout-shift
  risk) — but nothing uses it; `App.tsx` declares the SF Pro system stack
  inline as a `SF` constant in every style object.

## Icons

- Social icons: inline SVG paths from the Figma export (`svgPaths`) — fine as
  brand glyphs but unstandardized (no shared size/color system).
- Arrows: hand-written inline `<svg>` with hardcoded stroke colors, duplicated
  in three components.
- `lucide-react` is installed but never used.

## Unused code (verified — zero imports from the app)

- `src/app/components/ui/` — **48 shadcn components** (accordion → tooltip). None imported.
- `src/app/components/figma/ImageWithFallback.tsx` — never imported.
- `src/imports/Home/index.tsx` — raw Figma export superseded by App.tsx (the 4 PNGs + `svg-u69mgp2x89.ts` in the same folder ARE used by App.tsx).
- `src/imports/OzeyBrandIdentity/` — raw Figma export, never imported.
- `src/imports/image.png`, `image-1.png`, `pasted_text/` — design references, never imported.
- `default_shadcn_theme.css` (repo root) — never imported.

## Dependency problems

- **~50 unused dependencies** serving the unused shadcn library: all
  `@radix-ui/*`, MUI (`@mui/material`, `@emotion/*`), `recharts`, `react-dnd`,
  `react-hook-form`, `embla-carousel`, `cmdk`, `vaul`, `sonner`, `react-slick`,
  `date-fns`, `react-day-picker`, `input-otp`, `next-themes`, `canvas-confetti`,
  `react-router` (installed, yet routing is useState), etc.
- **Actually used at runtime:** `react`, `react-dom`, `motion` — nothing else.
- **react/react-dom are optional peerDependencies**, not real dependencies —
  a fresh install on CI/Vercel is not guaranteed to have them.
- **macOS-only devDependencies** pinned as direct devDeps
  (`@esbuild/darwin-arm64`, `@rollup/rollup-darwin-arm64`,
  `@tailwindcss/oxide-darwin-arm64`, `lightningcss-darwin-arm64`) — these
  break or warn on Linux CI/Vercel builds; they are transitive optional deps
  and should never be direct.

## index.html

- `<title>Interactive website</title>` — Figma Make boilerplate.
- `noindex, nofollow` — acceptable while in draft; must be removed before launch.
- No favicon, no meta description tuned to Ozey. (Deferred: SEO is a later phase.)

## Visual experiments conflicting with the locked system

- Gradient used as **decoration** on every section eyebrow label (Reality,
  Infrastructure, Products) — violates "one phrase per section / color is a signal".
- Hero side rulers use white-alpha lines instead of slate `border/grid` tokens.
- About/Products pages built on the old `#1868DB` blue identity.
- Product cards use a glossy white gradient border permanently (locked system:
  gradient border only during interaction; default border = `border.subtle`).

## Phase 1 consequences

1. Introduce `src/styles/tokens.css` as the **single canonical token source**.
2. Replace `theme.css` shadcn tokens with an Ozey base layer.
3. Drop the Inter import; typography goes through the SF system stack + type-scale utilities.
4. Build primitives (containers, type, buttons, cards, icon wrapper) that later phases compose.
5. Refactor header/footer onto tokens + primitives with real accessibility.
6. Delete verified-unused components/deps; fix `react` to a real dependency; remove darwin-only devDeps.
7. Add `typescript` + `tsconfig.json` so type-checking exists at all.
