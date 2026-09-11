# Ozey Design System v1.0 — Brand Operating System

> **Ozey doesn't decorate software. It reveals invisible systems.**

This document is the DNA of the Ozey ecosystem. Every Ozey product — the website,
SHG, Spendrova, Ozey Sell, Ozey Book, Ozey Stock, and everything yet to come —
inherits from this document. It ensures every experience feels unmistakably Ozey
without forcing every product to look identical.

If a design breaks a rule in this document, it is not Ozey.

**Contents**

1. [Foundation](#1-foundation)
2. [Colors](#2-colors)
3. [Typography](#3-typography)
4. [Icons](#4-icons)
5. [Gradient Behavior](#5-gradient-behavior)
6. [Spatial System](#6-spatial-system)
7. [Motion System](#7-motion-system)
8. [Design Constitution](#8-design-constitution)

---

## 1. Foundation

The system in one view:

| Layer | Definition |
| --- | --- |
| **Canvas** | Deep black — near-black surfaces, never pure black everywhere |
| **Typography** | SF Pro system stack + slate hierarchy |
| **Icons** | SF Symbols visual language |
| **Brand energy** | The Ozey multicolor gradient |
| **Rule** | Neutral interface, rare moments of living color |

The governing principle:

> **Color is not decoration. Color is a signal.**

The gradient represents **intelligence becoming visible**. Whenever something
becomes connected, activated, discovered or understood — the gradient appears.
It should feel like energy travelling through a system. Never decoration.

A useful composition ratio for any screen:

- **85%** black and slate
- **10%** white typography
- **5%** gradient energy

---

## 2. Colors

### 2.1 Core surfaces

Do not use pure black everywhere. The small differences between surfaces create
depth without visible shadows.

| Token | Hex | Use |
| --- | ---: | --- |
| `surface.canvas` | `#050607` | Main website background |
| `surface.primary` / `surface.section` | `#0A0C0F` | Large sections and footer |
| `surface.card` | `#101318` | Product cards |
| `surface.elevated` / `surface.card-hover` | `#151920` | Hovered cards, menus, overlays |
| `surface.subtle` / `surface.overlay` | `#1B2028` | Chips, secondary containers, overlays |

Usage rules:

- Main page: `surface.canvas`
- Quiet section separation: `surface.section`
- Product cards: `surface.card`; hovered: `surface.card-hover`
- Menus and overlays: `surface.overlay`
- Do **not** alternate background colors for every section — use spacing before
  using another surface.

### 2.2 Slate text palette

| Token | Hex | Use |
| --- | ---: | --- |
| `text.primary` | `#F5F7FA` | Main headings and active content |
| `text.secondary` | `#B8C0CC` | Supporting copy |
| `text.tertiary` | `#7C8796` | Labels, metadata and inactive words |
| `text.muted` | `#4C5664` | Disabled or pre-activation text |
| `text.inverse` | `#07101C` | Text over bright gradient surfaces |

For the scrolling "Current Reality" sequence:

- inactive word: `text.muted`
- approaching activation: `text.tertiary`
- active word: `text.primary`
- avoid giving every active word the gradient — the gradient remains rare

### 2.3 Borders and decoration

Avoid pure white borders. They make the interface feel harsh.

| Token | Value | Use |
| --- | ---: | --- |
| `border.subtle` | `rgba(148,163,184,0.10)` | Default dividers |
| `border.default` | `rgba(148,163,184,0.16)` | Cards and navigation surfaces |
| `border.strong` | `rgba(148,163,184,0.26)` | Hover and focus states |
| `grid.subtle` | `rgba(148,163,184,0.055)` | Optional card grids |
| `overlay.soft` | `rgba(5,6,7,0.72)` | Overlay surfaces |

Rules:

- Default cards: subtle border. Hover: default or strong border.
- Focus: gradient signal border — the gradient border appears **only during interaction**, never permanently.
- Dividers: subtle border only.

### 2.4 The Ozey Living Gradient

A five-stop gradient derived from the logo slash:

```css
--ozey-gradient: linear-gradient(
  135deg,
  #FF3B5C 0%,
  #FF9F32 22%,
  #FFD84D 39%,
  #39C6E8 64%,
  #7B61FF 82%,
  #D94CE6 100%
);
```

**Use it for:** the Ozey logo slash · one important phrase per major section ·
active progress or signal movement · focused CTA borders · selected navigation
indicators · subtle hero illumination.

**Never use it for:** paragraphs · complete card backgrounds · every icon ·
all buttons · borders around every component · large decorative blobs.

### 2.5 Supporting glow tokens

```css
--glow-cyan:    rgba(57, 198, 232, 0.20);
--glow-violet:  rgba(123, 97, 255, 0.18);
--glow-magenta: rgba(217, 76, 230, 0.14);
--glow-warm:    rgba(255, 159, 50, 0.12);
```

These appear only as soft atmospheric light. Never combine all four at full
strength.

---

## 3. Typography

### 3.1 Primary typeface — SF Pro

Use the system-font stack rather than uploading or redistributing Apple's font
files. Apple devices get genuine SF Pro; everywhere else gets safe fallbacks.

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Display",
  "SF Pro Text",
  "Helvetica Neue",
  Arial,
  sans-serif;
```

### 3.2 Typeface roles

- **SF Pro Display** — hero headlines, section headlines, large product names, major statements
- **SF Pro Text** — body copy, navigation, labels, buttons, cards, metadata
- **SF Mono (optional)** — small section indexes, technical metadata, tiny system labels only. Never paragraphs.

### 3.3 Type scale

| Token | Desktop | Mobile | Weight | Line height |
| --- | ---: | ---: | ---: | ---: |
| `display.hero` | 72px | 44px | 700 | 0.98 |
| `display.section` | 56px | 38px | 650 | 1.02 |
| `heading.xl` | 40px | 32px | 650 | 1.08 |
| `heading.lg` | 30px | 26px | 600 | 1.15 |
| `heading.md` | 22px | 20px | 600 | 1.20 |
| `body.lg` | 19px | 18px | 400 | 1.50 |
| `body.md` | 16px | 16px | 400 | 1.55 |
| `body.sm` | 14px | 14px | 400 | 1.45 |
| `label.md` | 13px | 13px | 550 | 1.20 |
| `label.sm` | 11px | 11px | 600 | 1.20 |

### 3.4 Typography rules

- Sentence case, not all caps — except very small system labels.
- No extreme condensed tracking.
- Headings: `letter-spacing: -0.025em`. Body: `-0.005em`. Labels: `0.04em`.
- Body copy widths around **45–65 characters**.
- No more than **three font weights** on one page: 400, 600, 700.

---

## 4. Icons

The icon language is **SF Symbols** — designed to align with SF Pro in weight,
scale and baseline.

**Styles:** default regular · buttons medium · large illustrative controls
semibold. Use rounded containers around icons rather than rounded icon variants
everywhere.

### 4.1 Icon sizes

| Context | Size |
| --- | ---: |
| Navigation | 16px |
| Inline action | 18px |
| Standard button | 18–20px |
| Card action | 20px |
| Feature icon | 24px |
| Large product marker | 32px |

### 4.2 Icon colors

- default: `text.secondary`
- active: `text.primary`
- selected: gradient, or one sampled gradient color
- disabled: `text.muted`
- destructive: introduce a separate semantic red only when required

### 4.3 Production note

SF Symbols are built primarily for Apple-platform interfaces. Before exporting
and embedding them into a production website, verify the planned usage complies
with Apple's symbol licensing terms. For a cross-platform public website, a
**custom Ozey icon set drawn with SF-like optical weight** is safer while
preserving the same visual consistency.

---

## 5. Gradient Behavior

### 5.1 Philosophy

The Ozey gradient is not a brand color. It represents **intelligence becoming
visible**. Whenever something becomes connected, activated, discovered or
understood — the gradient appears. It should feel like energy travelling
through a system. Never decoration.

### 5.2 The four gradient variants

**1. Identity Gradient** — the official Ozey mark.
Used **only** for: logo slash, app icons, favicon, social preview, splash
screen. Stops: Red → Orange → Yellow → Cyan → Blue → Violet → Pink.
Always identical. Never animated.

**2. Aurora Gradient** — behind the hero only.
Very soft, opacity **5–12%**, never saturated, no hard edges.
Think Apple Intelligence. Think Northern Lights. Not Instagram.

**3. Signal Gradient** — a small travelling highlight.
Used on CTA hover, active navigation, progress, selection, hover border.
Length **120–180px**. Moves slowly.

**4. Intelligence Gradient** — text only.
Examples: *respect gap*, *Origin*, *Connection*, *Savings*, *Insights*,
*Connected*. Never entire headings. Never paragraphs.
Maximum: **one highlighted phrase per section**.

### 5.3 Motion rules

The gradient never loops continuously. Instead, it **breathes**:

```
glow appears → travels → rests → slow fade → 8 seconds silence → repeat
```

### 5.4 Direction rule

Every gradient in the system flows **↗ bottom-left to top-right (135deg)** —
exactly like the logo slash. This creates subconscious consistency.

### 5.5 Opacity ceilings

| Role | Opacity |
| --- | ---: |
| Hero glow | 8% |
| Button border | 30% |
| Text | 100% |
| Hover glow | 18% |
| Card reflection | 12% |

Never 100% except on text.

### 5.6 Shape rule

No circles. No blobs. Always **light fields** — imagine light entering
atmosphere, not paint.

### 5.7 Where the gradient is allowed

| YES | NO |
| --- | --- |
| Logo | Cards |
| Keyword | Section backgrounds |
| CTA | Paragraphs |
| Hover | Icons |
| Progress | Navigation text |
| Glow | Borders everywhere |
| Focus | Footer |
| Loading | Large surfaces |
| Selection, Signal, Product highlights | |

### 5.8 Section-by-section allocation

- **Hero** — Aurora + Identity logo. Maximum energy.
- **Current Reality** — one active word gets gradient; everything else grey.
- **Respect Gap** — only the words "respect gap" get it. A travelling gradient. Exactly once. Never repeats.
- **Infrastructure** — a tiny signal line. No big gradient.
- **Product cards** — one faint gradient reflection only. Almost invisible.
- **Footer** — no gradient. The logo is enough.

### 5.9 CTA behavior

- Default: white text (`Learn More →`), neutral appearance.
- Hover: gradient border + a tiny travelling light + the arrow moves.
- **Never** a filled rainbow button.

### 5.10 Animation timing

| Phase | Duration |
| --- | ---: |
| Glow | 4s |
| Rest | 8s |
| Travel | 1.2s |
| Fade | 800ms |

Everything slow. Nothing gaming.

### 5.11 Blur rule

Use **40px / 80px / 120px**. Never 10px — tiny blur looks cheap.

### 5.12 The golden rule

If removing the gradient makes the page feel exactly the same, the gradient is
unnecessary. If removing it makes the experience feel lifeless, it was used
correctly.

---

## 6. Spatial System

> **Space creates calm. Curves create continuity. Depth creates focus.**

### 6.1 Layout grid

```css
--page-max-width: 1440px;
--content-max-width: 1280px;
--reading-max-width: 720px;
--page-gutter: clamp(24px, 5vw, 80px);
--section-padding-block: clamp(96px, 12vw, 180px);

--grid-columns: 12;
--grid-gap: 24px;
```

- **Tablet:** 8 columns, 24–40px side gutters, 20px gap.
- **Mobile:** 4 columns, 20px side gutters, 16px gap.

Do not center every section automatically. Alternate between editorial left
alignment, focused centered statements, and asymmetric product compositions —
this prevents the site from feeling like stacked presentation slides.

### 6.2 Spacing scale (4px base)

| Token | Value | Typical use |
| --- | ---: | --- |
| `space.1` | 4px | Tiny icon gaps |
| `space.2` | 8px | Inline spacing |
| `space.3` | 12px | Compact controls |
| `space.4` | 16px | Default internal gap |
| `space.5` | 20px | Body groups |
| `space.6` | 24px | Card content |
| `space.8` | 32px | Component separation |
| `space.10` | 40px | Large card padding |
| `space.12` | 48px | Section content groups |
| `space.16` | 64px | Major visual gaps |
| `space.20` | 80px | Editorial pauses |
| `space.24` | 96px | Section divisions |
| `space.32` | 128px | Large narrative transitions |
| `space.40` | 160px | Cinematic desktop spacing |

No arbitrary values (`37px`, `58px`, `93px`).

### 6.3 Corner radius

Corners should feel soft, but not playful. Curves communicate continuity,
not cuteness.

| Token | Value | Use |
| --- | ---: | --- |
| `radius.sm` | 10px | Small chips, tags |
| `radius.md` | 16px | Buttons, compact surfaces |
| `radius.lg` | 24px | Navigation / gateway cards |
| `radius.xl` | 32px | Main product cards |
| `radius.2xl` | 44px | Hero visual containers |
| `radius.pill` | 999px | Pills and circular controls |

Rules: product cards `32px`, gateway cards `24px`, buttons `999px` or `16px`
by role. Avoid sharp corners, avoid a different radius on every component,
avoid excessively bubbly cards.

### 6.4 Elevation

Avoid obvious box shadows. Dark-theme depth comes from surface contrast,
borders, and controlled illumination.

```css
--shadow-card:       0 24px 80px rgba(0, 0, 0, 0.28);
--shadow-card-hover: 0 32px 100px rgba(0, 0, 0, 0.40);
--shadow-overlay:    0 40px 120px rgba(0, 0, 0, 0.52);
```

Product card hover: translate up `4px` · deepen shadow · strengthen border
slightly · scale **only the preview** to `1.02` · never scale the whole card
aggressively.

### 6.5 Product card structure

Both Spendrova and Ozey SHG (and all future products) share one structure:

```
Product index
App name
One-line description
Optional short supporting copy
Large preview area (50–60% of card height)
Minimal navigation control
```

Desktop dimensions:

```css
width: min(520px, 42vw);
min-height: 620px;
padding: 40px;
border-radius: 32px;
```

The card is a **gateway, not a dashboard** — no feature chips, metrics, tabs,
graphs, or multiple buttons in one card.

### 6.6 CTA geometry

```css
--control-height-sm: 36px;
--control-height-md: 44px;
--control-height-lg: 52px;
```

- **Primary CTA:** pill shape · 44–48px height · warm-white text · neutral
  border by default · gradient signal on hover.
- **Secondary CTA:** text + arrow · no container unless necessary · arrow moves
  4–6px on hover.
- No filled gradient buttons.

### 6.7 Section rhythm (homepage)

1. **Hero** — large vertical silence, ~`100svh`.
2. **Current Reality** — editorial left-aligned, generous negative space.
3. **Respect Gap** — focused, centered moment with reduced surrounding activity.
4. **Infrastructure** — large statement followed by product proof.
5. **Products** — horizontal cards on desktop, stacked on mobile.
6. **Gateway cards** — smaller and quieter than product cards.
7. **Footer** — compact, restrained, no visual spectacle.

### 6.8 Motion geometry

All reveals follow the logo slash angle:

```css
--ozey-angle: 135deg;

--motion-distance-sm: 8px;
--motion-distance-md: 16px;
--motion-distance-lg: 24px;
```

Diagonal clipping or light movement only for: hero introduction, section
heading reveal, gradient signal travel, product preview entrance. Do not
diagonally animate every element. Avoid large 80–100px entrance animations.

### 6.9 Spatial acceptance criteria

The spatial system is correct when:

- the page feels calm even without the gradient
- cards feel related without looking duplicated
- all curves feel intentional; no component appears randomly rounded
- section transitions feel editorial rather than template-like
- the gradient remains the most valuable visual event
- the website still feels unmistakably Ozey **in grayscale**

---

## 7. Motion System

### 7.1 Core principle

> **Nothing appears instantly. Everything becomes visible.**

Not fade-in, zoom-in, pop, or bounce. Things **reveal themselves** — like
understanding, like intelligence, like discovering something hidden.

People should recognize an Ozey page after watching it for 3 seconds, even with
the logo removed.

### 7.2 Motion personality

Ozey is **calm · intelligent · precise · patient**.
Never playful, energetic, elastic, flashy, or dramatic.
Animation should feel inevitable, not exciting.
Every animation answers "**I discovered**," never "I hovered."

### 7.3 The six motion families

Only six animation families exist. Everything is built from these.

**1. Reveal** — used everywhere (text, cards, buttons, sections). Instead of
fading, a soft mask slides — like light uncovering information.
Duration 600–900ms.

**2. Connect** — inspired by galaxies. Not drawing lines: growing
relationships. Two tiny dots → become connected → curve grows → signal
arrives → line fades. Never permanent.

**3. Orbit** — hero only. Tiny particles slowly orbit invisible centers,
almost impossible to notice. Without it the hero feels dead.

**4. Signal** — the gradient light, travelling. Never looping, never
continuous. Appears only after interaction.

**5. Focus** — hovering something does not make it bigger. Instead, everything
else gets quieter: sibling cards dim to ~88% opacity while the hovered card
stays at 100%.

**6. Flow** — when scrolling, sections don't arrive; they emerge from
darkness, like fog disappearing.

### 7.4 Signature interactions

- **Cursor gravity** — the cursor attracts nearby stars in the hero: tiny
  stars very gently shift ~6px toward it. Nothing else. No glowing cursor,
  no trailing particles.
- **Hero identity** — the logo stays fixed; the universe slowly rotates
  *around the logo*, almost impossible to notice.
- **Current Reality** — each word wakes up like a neuron firing:
  grey → white → signal travels → returns to slate.
- **Respect Gap** — "technology gap" stays slate; only "respect gap" receives
  a travelling gradient. Exactly once. Never repeats.
- **Infrastructure** — behind the headline, very faint orbital rings expand
  ~2% while scrolling. Invisible until noticed.
- **Product cards** — hover Spendrova: a tiny gradient pulse travels through
  an invisible path toward SHG, then stops. Systems inside one ecosystem.
- **Footer** — tiny, almost invisible stars. Every 20–30 seconds one pulse
  travels left → right, like data crossing the network. Felt, not seen.
- **Loading** — never a spinner. The Ozey slash draws, gradient travels once,
  logo completes, website begins.

### 7.5 The Living Orbit (signature element)

Very faint concentric orbital curves are embedded into the background
geometry — not decoration, but the **invisible infrastructure of the site**.

As you scroll: sections align to these invisible orbits · particles drift
along them · gradient signals travel across them · product cards appear to
"dock" onto them.

Most visitors won't consciously notice the curves — but they'll feel that
every part of the page belongs to the same system.

### 7.6 Reduced motion

With `prefers-reduced-motion: reduce`, nothing breaks and nothing is withheld:
everything simply **appears** instead of moving.

---

## 8. Design Constitution

If Steps 1–7 define *what* Ozey looks like, the constitution defines *how Ozey
makes decisions*. These are not suggestions. These are rules. If a design
breaks one of these rules, it is not Ozey.

**Principle 1 — Intelligence should feel inevitable.**
Software should never look like it is trying to impress. Users should think
"of course it works like this," never "that's a cool animation."

**Principle 2 — Silence is a design element.**
Whitespace is not empty. Darkness is not empty. Time without animation is not
empty. If every section moves, nothing feels important. Animation is earned.

**Principle 3 — Motion explains meaning.**
Every movement must answer: what became visible? what became connected? what
became understood? If the animation has no narrative purpose, remove it.

**Principle 4 — The interface reveals itself.**
Nothing appears instantly. Nothing pops. Nothing bounces. Nothing demands
attention. Everything emerges naturally — like understanding.

**Principle 5 — Color is earned.**
The gradient is never branding. The gradient is intelligence. When something
becomes clearer, the gradient appears. When understanding is complete, it
disappears.

**Principle 6 — Geometry follows nature.**
Curves communicate continuity. Circles communicate origin. Orbits communicate
relationships. The universe is inspiration, not decoration.

**Principle 7 — Every element has one purpose.**
Cards introduce products. Buttons create actions. Typography tells stories.
Backgrounds create atmosphere. Never combine multiple purposes into one
element.

**Principle 8 — Products deserve their own stage.**
Ozey is an ecosystem. Every product has its own personality, yet still feels
like it belongs to Ozey. Shared DNA. Unique expression.

**Principle 9 — The system is more important than the screen.**
Do not design pages. Design behaviors. Every page is another expression of the
same operating system. Consistency comes from principles, not repetition.

**Principle 10 — Remove before adding.**
Whenever something feels missing, first ask: can another element be removed?
Only add when subtraction cannot solve the problem. Restraint creates identity.

**Principle 11 — Emotional progression matters more than visual progression.**
Every page guides one emotional journey. Homepage: Curiosity → Recognition →
Understanding → Confidence → Discovery → Products. Never present everything at
once.

**Principle 12 — The interface should disappear.**
Visitors should remember the story, the products, the feeling, the philosophy —
not the UI. Great design becomes invisible.

**Principle 13 — Every interaction leaves the interface calmer than before.**
Hovering, scrolling, clicking, revealing — each should reduce complexity, not
increase it. The website feels increasingly organized as the visitor explores.
Just like Ozey itself.

**Principle 14 — Every product starts from the same four words.**

- **Origin** — Where does this journey begin?
- **Connection** — What becomes connected?
- **Structure** — How is complexity simplified?
- **Direction** — What new possibility opens?

This is the philosophical framework behind the entire ecosystem.

**Principle 15 — Build for the next ten years.**
Avoid trends. No glassmorphism because it is fashionable. No AI gradients
because everyone uses them. No oversized animations because they look
impressive today. Design as if the website should still feel modern in 2035.
Timelessness is a feature.

### The Final Rule — five questions to end every design review

1. Could this belong to another SaaS company? If yes, it isn't Ozey.
2. Does the animation explain meaning, or only attract attention?
3. If we removed the logo, would someone still recognize this as Ozey?
4. Does the interface become calmer, clearer, and more organized as people continue?
5. Are we respecting the user's attention, or consuming it?

---

## Appendix — Implementation order for `website-v2`

1. Global tokens
2. Font and icon setup
3. Shared header/footer
4. Homepage structure
5. Gradient behavior
6. Product cards
7. Responsive states
8. Accessibility and reduced-motion validation

---

*Ozey Design System v1.0 · Locked 2026 · Every future Ozey surface inherits from this document.*
