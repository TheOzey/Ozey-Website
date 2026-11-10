# Ozey Workforce Identity: Architecture

Status (dev phase): **implemented and verified locally against Firebase
emulators; no cloud resources created yet.** `ozey-workforce-dev` is created
by following [`workforce/README.md`](../../workforce/README.md) once Cloud
Identity for `ozey.in` exists. Production `ozey-workforce` is not started.
`ozey-shg` is untouched. See §12 for exactly what exists and how it was verified.

```
Ozey Console (www.ozey.in/dashboard)
        │  employee signs in
        ▼
Ozey Workforce Identity  (project: ozey-workforce)
        │  employee → status → roles → permissions
        ▼
Product access broker  (console server)
        │  short-lived, product-scoped credential
        ▼
Product backends: ozey-shg · spendrova · non-Firebase APIs
        (each enforces its own permissions)
```

Principles:

1. **Employees and customers are separate identities.** No employee ever uses,
   or is created in, a product's customer account pool as a customer. No
   customer ever exists in `ozey-workforce`.
2. **Identity and roles are global; enforcement is per product.** The console
   decides *who* someone is and *which* product permissions they hold. Each
   product's own backend (Firestore rules, API authorization) decides what those
   permissions allow.
3. **No superuser.** There is no `*` permission, no global `isStaff` flag, and
   no console path that reads product data with rule-bypassing admin
   credentials.
4. **Access is fresh, short-lived and revocable.** Permissions are read from
   the employee record, not from long-lived tokens.

---

## 1. Findings that shaped this design (read-only, 2026-09-30)

| Fact | Consequence |
|---|---|
| `ozey.in` mail is hosted by GoDaddy (`MX secureserver.net`). There is **no Google Workspace**. | Domain-restricted Google sign-in needs a Google-managed directory for `ozey.in`; see §4. |
| Cloud Identity sign-up with `hello@ozey.in` was not possible. | **V1 decision:** the existing Ozey Google account `web.viru@gmail.com` is the first and only administrator (§4). |
| DNS is on Cloudflare; `www.ozey.in` is served by **Vercel**. | The console runs on Vercel. Server credentials should use Vercel OIDC → Google Workload Identity Federation (no key files). |
| `ozey-shg`: phone auth only, Identity Platform tier, App Check unenforced, no web app, no org parent, billing on. | SHG stays customer-only. The console never signs in to SHG as a customer. |
| No existing staff/admin pattern in SHG code, rules or IAM. | Nothing to migrate; this design is the first. |

## 2. Recommended projects

| Project | Purpose | Contains | Never contains |
|---|---|---|---|
| **`ozey-workforce`** (new) | Employee identity + console authorization | Google sign-in for listed employees, employee/role records, audit log, blocking functions | Customers, product data |
| **`ozey-workforce-dev`** (new, recommended) | Staging for the above | Same, with test employees | Production employees |
| `ozey-shg` (existing) | SHG product + its customers | Unchanged now. Later: staff *proxy* principals via custom tokens (§7) | Google auth, employee accounts, `ozeyStaff` claims |
| `spendrova` (future) | Spendrova product | Same pattern as SHG | Employee accounts |

Region for `ozey-workforce` Firestore and Functions: `asia-south1` (Mumbai).
Both new projects need the **Blaze** plan (blocking functions) and the
**Identity Platform** upgrade (blocking functions, audit logging, SLA).

## 3. Identity model (in `ozey-workforce` Firestore)

All collections are **server-only**: client rules deny all reads and writes.
Only the console server (Admin SDK, least-privilege service account) and the
blocking functions touch them.

```
employees/{employeeId}          employeeId = "emp_<random>", stable forever
  email:        "web.viru@gmail.com"   lowercased Google account email; the join key at sign-in
  displayName:  string
  status:       "invited" | "active" | "suspended" | "offboarded"
  roles:        ["shg-viewer", ...]
  authUid:      string | null       Firebase uid in ozey-workforce, set on first sign-in
  createdAt, createdBy, updatedAt, updatedBy, lastSignInAt
  employeeNumber: "EMP-0001"        human-readable label (not an identity); set at creation
  firstName, secondName | null, lastName       displayName = the three joined
  address: { doorNo?, street?, locality?, city?, district?, state?, postalCode? }   all optional

counters/employees              server-only
  next:         number              next employee number; advanced in the creating transaction

roles/{roleId}                  e.g. "shg-viewer"
  description:  string
  permissions:  ["shg:read"]
  product:      "shg" | "spendrova" | "console"   one product per role

products/{productKey}           the permission vocabulary each product defines
  permissions:  ["shg:read"]              V1 vocabulary: read-only
  backend:      "firebase" | "api"

auditLog/{autoId}               append-only
  at, actor (employeeId), action, target, product?, permissions?, ip?, userAgent?
```

**Employee status**

| Status | Can sign in | Meaning / transition |
|---|---|---|
| `invited` | yes, then becomes `active` | Record created by an admin; never signed in |
| `active` | yes | Normal |
| `suspended` | no | Temporary block; sessions and product credentials revoked |
| `offboarded` | no | Terminal; record kept for audit, never deleted or reused |

`employeeId` is separate from the Firebase `uid`, so a recreated Google
account can be re-linked without losing history or product audit trails.

**Creating employees.** `POST /api/employees` (console server only; requires
`console:employees.manage`, same-origin) validates the input, checks every
role exists and the email is unused, then in **one transaction** creates
`employees/emp_<random>` with `status: "invited"`, advances
`counters/employees.next` and appends an `employee-created` `auditLog` entry.
Every creation reads and writes the counter, so concurrent creations
serialise and the email check cannot race; numbers are never reused, even if
a record is removed. Existing records created before numbering show
"Not assigned". Sign-in admission is unchanged: the first Google sign-in links
the record and makes it `active`.

**Editing and deleting employees.** `PATCH` / `DELETE /api/employees/{employeeNumber}`
use the same guard (same-origin, session, `console:employees.manage`).
Employees are addressed only by `employeeNumber`; the document id never leaves
the server.

- *Edit* changes names, email, roles (role ids, validated against `roles`) and
  address, in one transaction with an `employee-updated` audit entry listing
  each changed field (`from` → `to`). `employeeNumber`, the document id,
  `createdAt` and `createdBy` are never written. Changing the email of a
  linked employee unlinks `authUid`, sets `invited` and revokes their sessions:
  the Google account belongs to the old address. Permissions are never copied
  onto the employee; sessions keep resolving them from `roles`.
- *Delete* is the existing terminal state: `status: "offboarded"`
  (+ `offboardedAt`, `offboardedBy`), an `employee-offboarded` audit entry and
  immediate session revocation. The record, its number and its history are
  kept, the counter is never decremented, and the email stays taken.
  Offboarded employees leave the directory and cannot sign in, be edited or be
  deleted again.
- An administrator cannot change their own email, remove their own
  `console:employees.manage`, or delete themselves.

This path touches only Workforce data. `tests/unit/boundary.test.ts` checks
statically that no employee-mutation file imports the SHG data layer, the SHG
reader or the SHG API; the emulator suite checks that SHG data is byte-for-byte
unchanged after every employee operation.

## 4. Authentication

### V1 (current): existing Ozey Google account, employee-record allowlist

The console's first and only administrator is **`web.viru@gmail.com`**, the
Google account that already owns Ozey's Google Cloud and Firebase projects.
There is no Cloud Identity, no Workspace and no DNS change. Only the Google
provider is enabled in `ozey-workforce[-dev]`.

Because a consumer Google account cannot be restricted by domain, **the
employee record is the allowlist**. Admission (blocking functions, `gate.ts`):

1. the provider is `google.com` and Google reports the email as verified;
2. **exactly one** `employees` record has that email, with status `invited` or `active`;
3. that record is unlinked or already linked to the same Firebase uid (§3).

An unknown Google account is refused before its Auth record is created. Two
independent layers sit in front of that:

- **OAuth consent screen in *Testing* mode** with `web.viru@gmail.com` as the
  only test user. Google refuses every other account before Firebase is involved.
- **2-Step Verification on `web.viru@gmail.com`.** With a consumer account this
  is the MFA boundary. Firebase cannot enforce or observe it, so it is an
  operational requirement.

### Later: managed domain (no code change)

If Ozey adopts a managed Google domain (Cloud Identity or Workspace on
`ozey.in`), set `WORKFORCE_ALLOWED_EMAIL_DOMAINS=ozey.in` and
`WORKFORCE_REQUIRE_MANAGED_ACCOUNT=true`. The gate then also requires the
email domain and Google's `hd` claim, 2SV becomes centrally enforceable, and
employee records move to `@ozey.in` addresses. Session handling, roles,
permissions and product access are unchanged.

The console server re-checks employee status on every request (§5), so
suspension takes effect immediately, not at the next sign-in.

## 5. Session handling (console server)

```
Browser                     Console server (Next.js on Vercel)       ozey-workforce
───────                     ──────────────────────────────────       ──────────────
Google popup (Firebase JS) ───────────────────────────────────────▶ blocking fns allow/deny
ID token ──POST /dashboard/api/session──▶ verifyIdToken(checkRevoked)
                                          require auth_time < 5 min
                                          load employee: status == active
                                          createSessionCookie(8 h)
◀── Set-Cookie: __session; HttpOnly; Secure; SameSite=Strict; Path=/dashboard
client signs out of Firebase JS (in-memory persistence: no tokens kept in browser storage)

every request ──▶ proxy.ts: no cookie → /dashboard/login
                  server: verifySessionCookie(checkRevoked) + employee active
                          (employee + effective permissions cached ≤ 60 s)
logout ──▶ clear cookie, revokeRefreshTokens(authUid), revoke product credentials (§7)
```

- The session cookie is the **only** long-lived credential, and it is HttpOnly.
- Mutating console endpoints also require a same-origin `Origin` header (CSRF).
- Effective permissions = union of the employee's roles' permissions,
  computed server-side on each request (after the short cache). They are
  **not** stored as custom claims in `ozey-workforce`, so changes apply within
  60 s without re-login.

## 6. Permission model

Permission format: `<product>:<capability>`. Each product owns its vocabulary
in `products/{key}`.

| Permission | Meaning (enforced by that product) |
|---|---|
| `shg:read` | Read-only visibility of all SHG groups (what the console does today) |
| `shg:write` | **Not defined in V1** (the console is read-only). Added to the vocabulary only when write operations are deliberately introduced. |
| `spendrova:read` | Read Spendrova operational data |
| `spendrova:support` | Spendrova support actions, as Spendrova defines them |
| `console:employees.manage` | Manage employee records and role assignments |
| `console:audit.read` | Read the workforce audit log |

Roles are named bundles, each scoped to **one** product:

| Role | Permissions |
|---|---|
| `shg-viewer` | `shg:read` |
| `spendrova-support` | `spendrova:read`, `spendrova:support` |
| `console-admin` | `console:employees.manage`, `console:audit.read` (**no product data**) |

Rules of the model:
- There is no wildcard. A console admin who also needs SHG data must hold
  `shg-viewer` explicitly.
- `console:*` permissions govern only the workforce project, never product data.
- The console UI shows or hides products and actions from effective
  permissions. The product backend independently enforces the same permission.
- Separation of duties: no one grants themselves roles. Role changes require
  `console:employees.manage` and are always audited.

## 7. Product access

The console server acts as a **broker**. It never reads product data with
admin credentials; it issues the browser a product credential that the
product's own backend checks.

### Firebase-backed products (SHG now, Spendrova later)

```
Browser ──POST /dashboard/api/access/shg──▶ console server
                                             session valid, employee active
                                             perms ∩ products/shg.permissions = ["shg:read"]
                                             if empty → 403
                                             Admin SDK *for ozey-shg* (broker service account):
                                               createCustomToken("ozw_<employeeId>",
                                                 { ozw: { v: 1, perms: ["shg:read"], until: now + 1 h } })
                                             audit: "product-token-issued"
◀── custom token
signInWithCustomToken on the named Firebase app "shg" (in-memory persistence)
existing SHG services/queries run unchanged ─▶ ozey-shg Firestore rules decide
```

What SHG's rules will check (designed later, deployed only after review;
replaces the `ozeyStaff` proposal):

```
function isOzeyWorkforce(permission) {
  return request.auth != null
      && request.auth.token.firebase.sign_in_provider == "custom"
      && request.auth.uid.matches("^ozw_emp_[A-Za-z0-9]+$")
      && request.auth.token.ozw.v == 1
      && permission in request.auth.token.ozw.perms
      && request.time.toMillis() < request.auth.token.ozw.until;
}
// reads:  allow read: if isOzeyWorkforce("shg:read") || <existing customer rules>;
// writes: unchanged (no shg:write rules until explicitly designed)
```

Properties:
- Customers cannot obtain this token shape. Custom tokens are only minted
  server-side, and phone-auth customers have `sign_in_provider == "phone"`.
- `until` puts a hard one-hour ceiling on any issued credential, even across
  token refresh. Revocation also calls `revokeRefreshTokens("ozw_…")` in the
  product project.
- **Side effect to accept or avoid:** the first sign-in creates an `ozw_…`
  user record in the product's Auth. It has no phone or email, a distinct uid
  prefix, and appears in the SHG Auth user list. To keep even these out of the
  customer pool, SHG could later allow an Identity Platform **tenant** for
  workforce proxies. That is a change to SHG Auth config, so it is deferred as
  a separate decision.
- The broker's service account in each product project needs only
  token-signing rights and `revokeRefreshTokens`. It has **no Firestore
  access**, so the console server itself cannot read product data.

### Future Spendrova (separate Firebase project)

The same flow with its own broker service account, its own named Firebase app
(`lib/firebase/apps.ts` gains a `spendrova` backend), its own rules checking
`isOzeyWorkforce("spendrova:read")`, and its own permission vocabulary. Nothing
in SHG or the workforce model changes.

### Non-Firebase products

The console server calls the product's API server-to-server with a
short-lived (≤ 5 min), audience-bound credential:

- **Preferred:** a Google-signed ID token for the broker service account,
  `aud` = the product API, plus a signed assertion of the employee and their
  product permissions (`sub = employeeId`, `perms`, `exp`).
- The product verifies both and authorizes against *its own* rules.
- The product never trusts the browser; the console never gets
  product-superuser credentials.

## 8. Security boundaries

| Boundary | Enforced by | Protects against |
|---|---|---|
| Who is an Ozey employee | OAuth test-user list + blocking functions + employee record (+ the account's own 2SV) | Non-employees, stolen passwords |
| Session validity | HttpOnly session cookie, `checkRevoked`, employee status on every request | Stale access after suspension or offboarding |
| Which products and capabilities | Roles → permissions, computed server-side | Over-granting in the UI |
| What a permission can touch in a product | **The product's own rules or API** | A compromised or buggy console |
| Credential lifetime in products | `until` claim (1 h), refresh-token revocation | Leaked product credentials |
| Accountability | Workforce `auditLog` + product-side logs | Undetected misuse |

If the console server is fully compromised, an attacker can mint product
tokens only for permissions the product's rules accept. They can read what
`shg:read` allows, but cannot write or bypass SHG's rules. That residual risk
is why `shg:write` stays unimplemented until it has its own review.

## 9. Global vs. per product

| Global (`ozey-workforce` + console) | Inside each product |
|---|---|
| Employee identity, Google sign-in, 2SV | Customer identities and customer auth |
| Employee status, offboarding | The meaning of each product permission |
| Roles and role assignment | Rules and API checks enforcing those permissions |
| Permission *vocabulary registry* (names only) | Product data, indexes, product audit trails |
| Console sessions, broker, workforce audit log | Broker service account's narrow signing rights in that project |
| Console UI shell and product switcher | Product module in the console (`modules/<product>`) |

## 10. Effect on `sites/console` (for the implementation step; nothing changed yet)

| Unchanged | Changes later |
|---|---|
| All SHG UI, services, queries, types, mappers | `lib/auth/identity.ts` → `ozey-workforce` backend |
| Shell, product registry, data states | Sign-in page: Google instead of phone OTP |
| SHG data model audit | New: `proxy.ts`, `api/session`, `api/access/[product]` (server) |
| | `lib/permissions`: permissions list from server session, not a boolean claim |
| | `lib/firebase`: SHG named app signs in with the broker's custom token |
| | `firebase/firestore.rules.proposed*` and `staff-access.rules.test.mjs`: **superseded**, replaced with the §7 design and tests |
| | `scripts/grant-staff-claim.mjs`: superseded by employee/role management |

## 11. What must be created or configured

The exact, ordered commands and console steps are in
[`workforce/README.md`](../../workforce/README.md). Summary for
`ozey-workforce-dev`, all as `web.viru@gmail.com`:

1. Project with no organization (like `ozey-shg`), billed to "Firebase Payment".
   **Currently blocked by the account's project quota; an increase has been requested.**
2. APIs, Firebase, Identity Platform, Firestore in `asia-south1`, and the console web app.
3. Service accounts `console-server@` (session admin + Firestore) and
   `workforce-auth-fns@` (Firestore + logs). `web.viru@gmail.com` may
   impersonate `console-server@` locally, so no key files.
4. Deploy the deny-all rules and blocking functions; seed products, roles and
   the single employee (dry run first).
5. Console-only steps: enable the Google provider; consent screen External +
   Testing with the single test user; confirm 2SV on the account.

Nothing touches `ozey-shg`, production DNS, Vercel or a production `ozey-workforce`.

---

## 12. Dev implementation status

### What exists (code only, in this repository)

| Where | What |
|---|---|
| `workforce/functions/src/gate.ts` | Admission rules (§4): Google provider, verified email, optional domain/`hd` policy (off in V1), exactly one employee record, status invited/active, uid link. 15 unit tests. |
| `workforce/functions/src/index.ts` | `workforceBeforeCreate` / `workforceBeforeSignIn` blocking functions (asia-south1, dedicated service account). They link `authUid`, move invited → active, and write `auditLog`. Denials return one generic message. |
| `workforce/firestore.rules` | Deny-all. Every workforce collection is server-only. |
| `workforce/scripts/seed-dev.mjs` | Products, roles and the single first employee. Dry run by default, idempotent, project allowlist excludes production and `ozey-shg`. |
| `sites/console/src/lib/server/` | Workforce Admin SDK (ADC, no keys); employee + permission resolution (≤ 60 s cache); session verification with revocation check on every request. |
| `sites/console/src/app/api/session/route.ts` | POST: Google ID token → session cookie. DELETE: sign out + refresh-token revocation. Same-origin only. |
| `sites/console/src/proxy.ts` | Optimistic redirect to sign-in when no cookie. |
| `sites/console/src/app/(console)/layout.tsx`, `shg/layout.tsx` | Server-side session and employee gate; SHG gate on `shg:read`; SHG shows "not connected" (`modules/shg/connection.ts`). |

The SHG UI, services, queries and mappers are unchanged. The phone-OTP sign-in
and the SHG-project client auth provider were removed from the console.

### How the first employee is represented

```
employees/emp_<random>
  email: "web.viru@gmail.com"   displayName: "Ozey Console Administrator"
  status: "invited" → "active" on first successful sign-in
  roles: ["console-admin", "shg-viewer"]
  authUid: <ozey-workforce uid, set on first sign-in>
  createdAt / createdBy: "seed-script" / updatedAt / lastSignInAt
```

Effective permissions: `console:audit.read`, `console:employees.manage`,
`shg:read`. There is no wildcard, and removing `shg-viewer` removes SHG access
(verified).

### Session

`ozey_console_session` cookie: Firebase session cookie, 8 h, `HttpOnly;
Secure; SameSite=Strict; Path=/dashboard`. It is created only from a Google
sign-in less than 5 minutes old, by an active employee. Every request verifies
signature, expiry and revocation, then the employee's status and roles.
Browser storage keeps no Firebase tokens.

### Verified locally (emulators, `demo-` projects)

Session, revocation and suspension checks were run under the earlier
`@ozey.in` policy; they do not depend on the admission policy. Admission was
re-verified under the V1 policy (seed → `products/shg` = `["shg:read"]`).

| Scenario | Result |
|---|---|
| `someone.else@gmail.com` (V1 policy) | Denied by `workforceBeforeCreate`; no account created; audited `not-an-employee` |
| `stranger@ozey.in` (no record) | Denied; no account created; audited `not-an-employee` |
| `web.viru@gmail.com` (V1 policy, any capitalisation) | Admitted; invited → active; uid linked; session cookie set, not readable by page JS |
| Unauthenticated `/shg/groups` | 307 to `/login?next=/shg/groups` |
| Forged cookie | Passes proxy, rejected by server → sign-in |
| Session POST from another origin / with a bad token | 403 / 401 |
| Remove `shg-viewer` | SHG shows "no access" within 60 s, no re-login |
| Suspend employee | Live session rejected (→ "suspended"); new Google sign-in denied by blocking function |
| Copied cookie after sign-out | Rejected. Fixed an edge case where a sign-out in the same second as sign-in did not revoke (Firebase's one-second revocation precision). |
| Network | Zero requests to any SHG backend |

Not verifiable in emulators: the consent screen's test-user restriction
and the account's 2SV. These are checked in `ozey-workforce-dev` (workforce/README.md, Phase C).

### Future SHG credential exchange

Unchanged from §7. `POST /dashboard/api/access/shg` will mint a ≤ 1 h custom
token (`ozw_<employeeId>`, `{ ozw: { v, perms: ["shg:read"], until } }`) with
a signing-only broker service account in `ozey-shg`. `SHG_DATA_CONNECTION`
becomes `"connected"`, and SHG's own rules enforce `shg:read`. That step,
including its rules, emulator tests and review, is a separate phase.
