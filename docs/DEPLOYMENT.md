# Deployment Architecture

How each Ozey website is built, hosted, and reached. This describes the
**current, confirmed** setup. Anything recommended-but-not-yet-built is marked
**Pattern** and anything that lives outside this repository is marked
**External**.

Values that exist only in the Vercel or Cloudflare dashboard are labelled
**External** rather than copied here, because a stale copy of an
infrastructure value is worse than no copy. Read them from the dashboard.

## At a glance

| Website | Directory | Workspace package | Vercel project | Production domain |
| --- | --- | --- | --- | --- |
| Ozey Corporate | `sites/ozey` | `@ozey/site-ozey` | `ozey` | `ozey.in` |
| Ozey SHG | `sites/shg` | `@ozey/site-shg` | `ozey-shg` | `shg.ozey.in` |

One GitHub repository. One Vercel project per website. One domain per project.

---

## 1. Repository architecture

Repository: **`TheOzey/Ozey-Website`** · production branch: **`develop`**

```
Ozey-Website/                 pnpm workspace root (no dependencies of its own)
├── pnpm-workspace.yaml       packages: sites/*
├── package.json              pnpm -r build / typecheck across every site
├── tsconfig.base.json
├── docs/                     design system + architecture notes
└── sites/
    ├── ozey/                 Corporate     → Vercel project: ozey
    └── shg/                  SHG           → Vercel project: ozey-shg
```

Each site is self-contained: its own `package.json`, `vite.config.ts`,
`tsconfig.json`, `index.html`, `public/` and `vercel.json`. Sites do not import
from each other and there is no shared UI package.

**Branches**

| Branch | Role |
| --- | --- |
| `develop` | Production branch for both Vercel projects. Source of truth. |
| `main` | Not deployed. Currently behind `develop`; left alone deliberately. |

Merging into `main` is an explicit, separate decision — nothing deploys from it.

---

## 2. Vercel project architecture

The monorepo is shared; **the Vercel projects are deliberately separate.**

```
                     GitHub: TheOzey/Ozey-Website
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              sites/ozey                    sites/shg
                    │                           │
          Vercel project: ozey        Vercel project: ozey-shg
                    │                           │
                 ozey.in                   shg.ozey.in
```

Both projects watch the same repository and the same branch. What keeps them
apart is the **Root Directory** setting — it is the single most important
safeguard in this architecture. Get it wrong and SHG content ships to the
Corporate domain, or the reverse.

### Confirmed settings

| Setting | `ozey` | `ozey-shg` |
| --- | --- | --- |
| Project ID | `prj_E65dq7Uf30YGlIXhNTgHEP8JkUZh` | `prj_wPdHLPVitIBHV6WyfnlhsyyIu1Vd` |
| Vercel team | `Ozey` (`team_ZvVJeJAG5KRPGwWRVrwaNWe0`) | same team |
| Repository | `TheOzey/Ozey-Website` | `TheOzey/Ozey-Website` |
| Root Directory | `sites/ozey` | `sites/shg` |
| Framework preset | Vite | Vite |
| Build command | `pnpm build` | `pnpm build` |
| Output directory | `dist` | `dist` |
| Production branch | `develop` | `develop` |
| Node version | 24.x | 24.x |
| Vercel domain | `ozey-ozey.vercel.app` | `ozey-shg.vercel.app` |

Root Directory, build command, output directory and production branch are
**External** — they live in Vercel → Project → Settings → General and Git, and
are not represented anywhere in this repository. Verify them in the dashboard
before trusting this table after any infrastructure change.

Because Root Directory is set per project, Vercel runs the build from inside
that directory. `pnpm build` there resolves to the site's own
`vite build` — not the root `pnpm -r build`.

### Routing and headers — `vercel.json`

Each site owns a `vercel.json` in its own directory. Vercel evaluates
**redirects → filesystem → rewrites**, which matters: a host-conditional
rewrite can never override a file that actually exists in `dist/`.

| | `sites/ozey/vercel.json` | `sites/shg/vercel.json` |
| --- | --- | --- |
| SPA rewrite | `/(.*)` → `/index.html` | `/(.*)` → `/index.html` |
| Legacy redirects | `/About.html`, `/Products.html` → clean paths (308) | none |
| Security headers | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` | none |
| `noindex` | applied only when `host = beta.ozey.in` | none |

Both sites route client-side over the History API, so the catch-all rewrite is
what makes deep links such as `/about` or `/privacy-policy` work on a refresh.

Two asymmetries are real and intentional to know about:

- SHG has **no security headers**. Corporate has them. Worth aligning.
- SHG has **no `typecheck` script** in its `package.json`, so the root
  `pnpm typecheck` silently skips it. Vite does not type-check, so nothing
  currently type-checks `sites/shg`.

---

## 3. Domain and DNS architecture

DNS for `ozey.in` is managed in **Cloudflare**. Vercel serves the sites; it does
not hold the zone.

| Hostname | Points to | Cloudflare mode |
| --- | --- | --- |
| `ozey.in` | Corporate | DNS only |
| `www.ozey.in` | Corporate | DNS only |
| `beta.ozey.in` | Corporate (beta/staging host, served `noindex`) | DNS only |
| `shg.ozey.in` | SHG, via the `ozey-shg` project CNAME | DNS only |

**All Vercel CNAMEs are DNS-only (grey cloud).** A proxied (orange-cloud) record
breaks Vercel's domain verification and its TLS certificate issuance.

### The CNAME target is project-specific

Vercel issues each project a distinct CNAME target of the shape
`<hash>.vercel-dns-0NN.com`. The hash differs per project. **Never copy the
target from another Ozey project, and never guess it** — read the exact value
Vercel shows after you add the domain. The target for `shg.ozey.in` is
**External**; it is deliberately not recorded here.

### Ownership verification — `_vercel.ozey.in`

`ozey.in` is already associated with an earlier Vercel account/project
configuration. Because of that, adding a new domain or subdomain to a *new*
Vercel project can require a fresh ownership-verification TXT record at
`_vercel.ozey.in`, of the form:

```
_vercel.ozey.in   TXT   "vc-domain-verify=<hostname>,<token>"
```

These records **accumulate**. `_vercel.ozey.in` holds one entry per verified
hostname.

> **Never replace or delete an existing `_vercel` TXT record.** Add the new one
> alongside the existing ones. Removing one you cannot positively attribute to a
> specific project and hostname can un-verify a domain that is serving
> production traffic.

Other records in the zone — SPF, MX, `google-site-verification` — are unrelated
to hosting and must not be touched during any deployment work.

---

## 4. Production deployment flow

```
commit → push to develop
    ↓
Vercel builds BOTH projects (same repo, same branch)
    ↓
ozey      builds sites/ozey  → dist → ozey.in
ozey-shg  builds sites/shg   → dist → shg.ozey.in
```

A push to `develop` triggers a production build of **every** project watching
that branch. Any other branch produces Preview deployments on
`*.vercel.app` only; Vercel serves those with `x-robots-tag: noindex`
automatically. Custom domains do **not** get that header automatically — which
is why `beta.ozey.in` sets it explicitly in `vercel.json`.

**Current SHG production deployment**

| | |
| --- | --- |
| Commit | `86d5c6ee8a377274cc37c85389ca67b40fba2281` |
| Deployment | `dpl_6W1ott5ybNYxbu39HyKuqVnL4yRA` |
| Branch | `develop` |
| Target | production |

### Local equivalents

```bash
pnpm install                # from the repo root
pnpm build                  # build every site
pnpm typecheck              # type-check every site that defines the script
cd sites/shg && pnpm dev    # work on one site
```

### Not yet configured

Neither project sets an **Ignored Build Step**. Every push to `develop`
rebuilds both sites even when only one directory changed. Harmless, just
wasteful. To fix it, set the project's Ignored Build Step to something like
`git diff --quiet HEAD^ HEAD -- sites/shg`.

---

## 5. Do / Don't

**Do**

- Keep one Vercel project per website, each with its own Root Directory.
- Change site behaviour in that site's own `vercel.json`, not globally.
- Add a custom domain only *after* the deployment is verified on `*.vercel.app`.
- Add only the DNS records Vercel generates for that specific project.
- Keep Vercel CNAMEs DNS-only in Cloudflare.
- Verify Root Directory in the dashboard after any Vercel project change.

**Don't**

- Don't point two websites at one Vercel project, or reuse a project for a new brand.
- Don't guess or copy a `vercel-dns` CNAME target from another project.
- Don't delete or overwrite `_vercel` TXT records without confirming which hostname each belongs to.
- Don't proxy (orange-cloud) a Vercel CNAME.
- Don't touch SPF, MX or `google-site-verification` records during deployment work.
- Don't deploy from `main` — nothing is wired to it.
- Don't assume Vite catches type errors. It doesn't; only `tsc --noEmit` does.

---

## 6. Pattern — adding a new brand website

**Not yet implemented.** Recommended shape for the next Ozey site:

```
sites/
  ozey/            → Vercel: ozey       → ozey.in
  shg/             → Vercel: ozey-shg   → shg.ozey.in
  <brand>/         → Vercel: ozey-<brand> → <brand>.ozey.in
```

Checklist:

1. Create `sites/<brand>/` with its own `package.json`
   (`@ozey/site-<brand>`), `vite.config.ts`, `tsconfig.json`, `index.html`,
   `public/` and `vercel.json`. `pnpm-workspace.yaml` already globs `sites/*`.
2. Keep its build configuration isolated — no cross-site imports.
3. Give it `build`, `dev`, `preview` **and** `typecheck` scripts.
4. Create a **dedicated** Vercel project, `ozey-<brand>`, in the `Ozey` team.
5. Connect it to `TheOzey/Ozey-Website`.
6. Set **Root Directory** to `sites/<brand>`. Confirm it before the first build.
7. Set the production branch to `develop` unless the architecture changes.
8. Set framework Vite, build `pnpm build`, output `dist`.
9. Deploy and confirm the deployment is `READY` and built from the expected
   branch and commit.
10. Verify the site on its `*.vercel.app` URL — routing, deep links, assets, icons.
11. Only then add the custom domain in Vercel → Settings → Domains.
12. Add exactly the records Vercel then shows: the project's own CNAME target,
    plus a `_vercel` TXT record if Vercel asks for one. DNS-only.
13. Leave every pre-existing `_vercel` TXT record in place.
14. Verify the custom domain serves the new site, over HTTPS, with a valid
    certificate — and confirm no other Ozey domain changed.

---

## 7. Pattern — changing an existing deployment safely

Deployment changes are hard to reverse and can take another brand's site down
with them. Order matters:

1. **Read the current state first.** Record the project's Root Directory,
   production branch, domains and current production deployment ID before
   changing anything.
2. **Change one layer at a time** — repository, then Vercel, then DNS. Never
   change repository content and DNS in the same step.
3. **Verify on `*.vercel.app`** before any custom domain is involved.
4. **Migrate a domain last.** Moving a domain between Vercel projects or
   accounts causes downtime if the CNAME and verification records are not
   already correct.
5. **Keep a rollback path.** Note the previous production deployment ID; Vercel
   can promote it again.
6. **Confirm the other sites still serve** after any shared-zone DNS change.

---

## 8. External / needs dashboard verification

Not verifiable from this repository. Check in the dashboard when it matters:

| Item | Where |
| --- | --- |
| Root Directory, build command, output directory | Vercel → Project → Settings → General |
| Production branch | Vercel → Project → Settings → Git |
| Custom domain assignment per project | Vercel → Project → Settings → Domains |
| Exact `vercel-dns` CNAME target per project | Vercel → Project → Settings → Domains |
| `_vercel` TXT records and their owning hostnames | Cloudflare → `ozey.in` → DNS |
| Which Vercel account/project still holds the legacy `ozey.in` configuration | Vercel dashboard |
| Environment variables, if any are ever added | Vercel → Project → Settings → Environment Variables |
