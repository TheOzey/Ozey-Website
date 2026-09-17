# Ozey Website

pnpm workspace containing the Ozey web properties.

```
sites/
  ozey/     → ozey.in       (corporate)
  shg/      → shg.ozey.in   (Ozey SHG)
docs/       → design system and architecture notes
```

Each site is deployed by its own Vercel project from the `develop` branch.
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) before changing anything to do with
hosting, domains or DNS.

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
cd sites/ozey         # or sites/shg
pnpm dev
```

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Repository, Vercel, domain/DNS and deployment architecture; how to add a new brand site |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Ozey Design System — tokens, type, colour, components |
| [docs/PHASE-1-AUDIT.md](docs/PHASE-1-AUDIT.md) | Historical snapshot of the corporate site before the design system landed |
