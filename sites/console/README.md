# Ozey Console

Internal operations console for Ozey products, served at `www.ozey.in/dashboard`.
Phase 1 ships the **SHG workspace**, a **read-only** view of the production SHG
Firebase project (`ozey-shg`). SHG is the only product shown in the console;
other products are added to `src/products/registry.ts` when they go live.

- Next.js 16 (App Router), React 19, TypeScript
- HeroUI v3 + Tailwind CSS v4, Lucide icons
- Firebase JS SDK 12 (Auth + Firestore), TanStack Query

Read [`SHG_DATA_MODEL.md`](SHG_DATA_MODEL.md) first. It documents the SHG data
model this console reads, and the one blocker below.

> **Status.** Console sign-in uses the Ozey Workforce identity (dev phase;
> see [`workforce/README.md`](../../workforce/README.md)). SHG data is **not
> connected**: the console holds no SHG credential until the short-lived
> `shg:read` exchange and matching SHG rules are built and reviewed
> ([OZEY_WORKFORCE_ARCHITECTURE.md §7](OZEY_WORKFORCE_ARCHITECTURE.md)).

---

## Getting started

```bash
cp .env.example .env.local        # workforce web config (or the emulator block)
pnpm install                      # from the repo root
pnpm --filter @ozey/console dev   # http://localhost:3100/dashboard
```

The workforce project, the local emulator setup and the credentials for the
session server are described in [`workforce/README.md`](../../workforce/README.md).

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js dev server / production build / serve |
| `pnpm lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `pnpm test:rules` | Emulator tests for the proposed staff-access rules (needs Java 21 + firebase-tools) |
| `pnpm emulators` | Local Auth + Firestore emulators with the proposed rules (`demo-` project, never production) |
| `pnpm grant-staff …` | Superseded phase-1 tool (SHG `ozeyStaff` claim). Do not use. |

To run the console against the emulators, set
`NEXT_PUBLIC_SHG_USE_EMULATORS=true` and `NEXT_PUBLIC_SHG_FIREBASE_PROJECT_ID=demo-ozey-shg`.
Any non-empty API key and app ID work. SMS codes appear at
`http://127.0.0.1:9099/emulator/v1/projects/demo-ozey-shg/verificationCodes`.

---

## Authentication and authorization

Console users are **Ozey employees**, not product customers. They sign in with
their `@ozey.in` Google account (Cloud Identity) against the workforce
identity project `ozey-workforce[-dev]`. The full design is in
[OZEY_WORKFORCE_ARCHITECTURE.md](OZEY_WORKFORCE_ARCHITECTURE.md), and the setup
runbook in [`workforce/README.md`](../../workforce/README.md).

- **Admission:** Identity Platform blocking functions admit only verified,
  domain-managed `@ozey.in` Google accounts with an invited/active employee record.
- **Session:** an HttpOnly, 8-hour Firebase session cookie scoped to
  `/dashboard`. Every request re-verifies it (including revocation) and the
  employee's status and roles.
- **Authorization:** product-scoped permissions from roles (`shg:read`, …).
  No wildcard, no global staff flag. The UI hides what you lack; each product's
  own backend enforces the same permission.
- **Product data:** SHG is currently **not connected**. The console holds no
  SHG credential until the short-lived `shg:read` exchange is built (design §7).

The phone sign-in and `ozeyStaff` claim from phase 1 are superseded. Their
files under `firebase/` and `scripts/grant-staff-claim.mjs` remain only as a record.

## Architecture

```
src/
  app/                          routes only (thin)
    login/                      Google (workforce) sign-in
    api/session/                session cookie create / sign-out
    (console)/                  authenticated shell (AccessGate + ConsoleShell)
      page.tsx                  /dashboard: product list
      employees/  roles/        console administration: employee directory + /employees/new (create);
                                roles are read-only
      shg/                      SHG workspace routes (see Navigation)
  components/                   product-agnostic console UI
    shell/                      sidebar, top bar, product header, session UI
    navigation/                 route-backed tabs
    admin/                      employees / roles tables, add-employee form
    tables/  data/  page/  states/  brand/
  lib/
    firebase/                   named Firebase app per product backend
    auth/                       identity backend, Google sign-in, client session context
    server/                     workforce Admin SDK, employees + permissions, session verification
    permissions/                claims + access rules for the UI
    hooks/  errors.ts  format.ts  pagination.ts
  products/                     product registry (SHG only)
  modules/
    shg/
      types/                    SHG domain types (no Firestore types)
      services/                 the only code that talks to Firestore
      queries/                  TanStack Query hooks over services
      components/  views/       SHG UI
```

### Navigation

Three levels, each with one job:

| Level | Where | Items |
|---|---|---|
| Console | left sidebar | Dashboard, Employees, Roles, then PRODUCTS → SHG |
| Product | tabs in the SHG header | Overview · Groups · Reports |
| Group | tabs on a group's pages | Overview · Members · Transactions · Loans · Meetings |

SHG routes:

```
/shg                                   Overview
/shg/groups                            Groups
/shg/groups/[groupId]                  group Overview (figures, details, rules, loan book, opening balance)
/shg/groups/[groupId]/members          ┐
/shg/groups/[groupId]/transactions     │ group-scoped sections
/shg/groups/[groupId]/loans            │
/shg/groups/[groupId]/meetings         ┘
/shg/groups/[groupId]/members/[memberId]   member detail
/shg/reports                           Reports (group and year chosen on the page)
```

Headers: product pages show the SHG band (white, under the main header);
a group's pages replace it with the group's band (name, village, formed date)
and put a "‹ Groups" back button in the main header. In both bands the large
identity scrolls away while the tab row stays stuck under the main header
(`components/shell/context-header.tsx`); on viewports under 480px tall the
row scrolls normally. A member page keeps the SHG band and a breadcrumb.

The group always comes from the URL, so refreshes and direct links keep the
context. Pre-refactor URLs (`/shg/members`, `/shg/transactions?group=…`, …)
redirect in `next.config.ts`. Product sections live in
`products/registry.ts` (`navigation`); SHG links are built with `shgRoutes`
in `modules/shg/navigation.ts`.

Data flows **UI → queries → services → Firebase**. Pages never import
`firebase/*`.

### Adding a product (e.g. Spendrova)

1. Add a backend to `lib/firebase/apps.ts`, e.g. `spendrova`, with its own env vars
   and its own Firebase project. Named apps keep the projects fully separate.
2. Create `modules/spendrova/{types,services,queries,views}`. Services may use
   Firestore, a REST API or anything else. Nothing outside the module depends
   on that choice.
3. Add routes under `app/(console)/spendrova/`, and flip its entry in
   `products/registry.ts` with its section tabs (`navigation`).
4. Extend `canAccessProduct` in `lib/permissions/access.ts`.
5. Give the product a credential exchange like SHG's (OZEY_WORKFORCE_ARCHITECTURE.md §7):
   a signing-only broker service account in the product project, and product
   rules that check `<product>:<capability>` on `ozw_` custom tokens.

### Firestore cost and scale

- Every list is cursor-paginated (25 rows, `limit(n + 1)`). Nothing downloads
  a whole collection.
- Totals use server-side `count()` / `sum()` aggregations, billed at one read
  per 1,000 index entries.
- Outstanding loans cannot be aggregated server-side, because the app's formula
  is per loan. The overview reads only non-repaid loans, capped at 5,000, and
  flags a partial result. At larger scale this should become a maintained
  aggregate.
- Query results are cached for 2 minutes and not refetched on window focus.
- Search is Firestore prefix search (case-sensitive). Full-text search would
  need a search index. That is a separate decision.

### Deployment at `www.ozey.in/dashboard`

`next.config.ts` sets `basePath: "/dashboard"`. Deploy the console as its own
app, then route `/dashboard/*` from the corporate site to it: a Vercel rewrite
or multi-zone, or a reverse proxy. The corporate site (`sites/ozey`) is a
separate Vite app and is unaffected.
