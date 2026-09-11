# Ozey Website

pnpm workspace containing the Ozey web properties.

```
sites/
  ozey/     → ozey.in   (corporate)
docs/       → design system and architecture notes
```

## Requirements

- Node.js 18+
- pnpm 10+

## Getting started

```bash
pnpm install          # install all workspace dependencies (run from the repo root)
pnpm dev              # start the corporate site dev server
pnpm build            # build every site
pnpm typecheck        # type-check every site
```

To work on a single site directly:

```bash
cd sites/ozey
pnpm dev
```
