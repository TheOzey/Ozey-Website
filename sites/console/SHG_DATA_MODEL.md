# SHG Data Model — Audit for the Ozey Console

Internal document. Records what the Ozey Console reads from the SHG backend and
why. **§10 (financial definitions) supersedes anything earlier that conflicts
with it**; it was re-derived on 2026-10-03 from `origin/main` @ `099da62` and
reconciled against production (`scripts/shg-reconcile.ts`). Written from a **read-only inspection** of the production SHG app
(`~/Projects/Ozey SHG/Ozey-SHG`, branch `develop` @ `1fb3ca5`). Nothing in the
SHG app, its rules, or its Firebase project was changed during this audit.

> `sites/shg` in this workspace is the SHG **marketing website** (a Figma
> export with hard-coded copy). It has no Firebase code and is not the data
> source.

---

## 1. Firebase project

| Item | Value | Source |
|---|---|---|
| Project ID | `ozey-shg` | `.firebaserc`, `lib/firebase_options.dart` |
| Database | Default Firestore database `(default)` | `firebase.json` |
| Registered apps | Android only (verified in the live project). **No web or iOS app is registered.** | `firebase apps:list`; `firebase_options.dart` throws for web and iOS |
| App Check | Activated in the Android app (Play Integrity / debug). Enforcement is a Console toggle — **status unknown** | `lib/main.dart`, `docs/security-hardening.md` |
| Indexes | `firestore.indexes.json` is empty: no composite indexes, no field overrides | `firestore.indexes.json` |

**Action needed:** register a **Web app** in the existing `ozey-shg` project
(Console → Project settings → Your apps → Add app → Web) to get a web config.
This adds a client registration only. It does not create a project or a
database.

## 2. Authentication

- **Provider:** Firebase Auth **phone number + SMS OTP** only
  (`lib/core/auth/firebase_auth_service.dart` — `verifyPhoneNumber` /
  `PhoneAuthProvider.credential`). No email, Google or other provider is used
  in code. Whether other providers are enabled in the Console is **unknown**.
- **Identity:** `request.auth.uid`. Phone numbers are stored normalised to 10
  digits but are never used for authorization.
- **User registry:** `/users/{uid}` mirrors login metadata (phone, name, role,
  groupId, memberId, appVersion). Only readable by the user themselves.
- **There is no concept of an Ozey staff / internal / global admin user.**
  `docs/firebase-user-registry.md` explicitly defers "admin read-all" because
  "a global-admin pattern does not exist yet".

For the web dashboard, phone sign-in needs these Console settings:
`localhost` and the production domain (`ozey.in` / `www.ozey.in`) listed
under **Authentication → Settings → Authorized domains**. Phone auth on the
web uses Firebase's built-in reCAPTCHA verifier.

## 3. Where Firestore sits in the SHG architecture

- Current production architecture: `v1.2.0-listener-sync`
  (`docs/sync-architecture.md`). Firestore is the **cloud source of truth**.
  Each device mirrors it into a local Hive cache via snapshot listeners.
- Writes are **admin-only** and go through an outbox. Writes still pending on
  a device's outbox are not in Firestore yet, so the dashboard cannot see them.
  This is expected.
- Reversals are **append-only negative entries** (`reversalOf` set, `amount`
  negative). Sums must include them. Financial documents are never deleted.

## 4. Collections

```
/inviteCodes/{inviteCode}
/users/{uid}
/system/config
/groups/{groupId}
    /memberUids/{uid}          membership index used by rules
    /members/{memberId}
    /joinRequests/{requestId}
    /savings/{savingId}
    /loans/{loanId}
    /repayments/{repaymentId}
    /meetings/{meetingId}
    /monthlyClosures/{closureId}   id is the period, "YYYY-MM"
    /openingBalance/current        single document
    /openingRepayments/{id}
```

All DTOs live in `lib/core/sync/models/*_dto.dart`. Every financial document
carries `createdAt`, `updatedAt` (Timestamp) and `schemaVersion` (currently 1).
The rules enforce the exact key set on write, so these shapes are reliable.

### `/groups/{groupId}` — `GroupDto`

| Field | Type | Notes |
|---|---|---|
| `groupId` | string | equals doc id |
| `groupName` | string | |
| `villageName` | string | **the only location field** |
| `formationDate` | Timestamp | |
| `monthlySavings` | int | ₹ expected per member per month |
| `meetingDay` | int | day of month, 1–28 |
| `loanInterest` | double | **% per month** |
| `latePenalty` | double | ₹ |
| `paymentGraceDays` | int | |
| `hasBankAccount` | bool | |
| `accountHolder`, `accountNumber`, `ifscCode` | string? | **bank details, sensitive. The dashboard does not display them.** |
| `inviteCode` | string | secret-ish join token. Not displayed. |
| `adminUid` | string | Firebase UID of the group admin (the sole write authority) |
| `createdAt`, `updatedAt` | Timestamp | |

There is **no group status field** (active/dormant/closed).

### `/groups/{g}/members/{memberId}` — `MemberDto`

| Field | Type | Notes |
|---|---|---|
| `id`, `uid` | string | `uid` = Firebase UID, may be empty for manually-added members |
| `name`, `phone` | string | phone is PII (10 digits) |
| `roleIndex` | int | `MemberRole`: 0 member, 1 secretary, 2 president |
| `statusIndex` | int | `MemberStatus`: 0 active, 1 inactive/left, 2 suspended (legacy), 3 pending, 4 declined. Rules require 0 on create. |
| `hasAdminAccess` | bool | cosmetic badge. Authority is `groups.adminUid`. |
| `monthlyTarget` | double | |
| `totalSavings` | double | **cached** value, recomputed by the app from `savings`. Useful for display, not authoritative. |
| `idNumber`, `address` | string? | PII. Not displayed. |
| `joinedAt`, `approvedAt` | Timestamp | |
| `approvedBy` | string | |
| `joinMethodIndex` | int | 0 invite, 1 groupCode, 2 manual |
| `leftAt` | Timestamp? | |
| `exitTypeIndex`, `settlementStatusIndex` | int? | 0 voluntary / 1 removed / 2 transferred; 0 pending / 1 completed |

### `/groups/{g}/savings/{id}` — `SavingEntryDto`

`id, memberId, memberName, amount (number, may be negative for a reversal),
date (Timestamp), period ("YYYY-MM"), notes?, recordedBy?, reversalOf?,
createdAt, updatedAt, schemaVersion`

### `/groups/{g}/loans/{id}` — `LoanDto`

`id, memberId, memberName, principal, interestRate (% per month), amountRepaid,
disbursedAt, dueDate, statusIndex, purpose?, createdAt, updatedAt,
schemaVersion`

`statusIndex` → `LoanStatus`: 0 pending, 1 active, 2 overdue, 3 repaid.

Derived values. These are the app's own formulas in
`lib/features/loans/models/loan.dart`. The dashboard copies them exactly:

```
loanMonths    = clamp((due.year − disbursed.year)·12 + (due.month − disbursed.month), 1, 120)
totalInterest = principal × (interestRate / 100) × loanMonths      // flat simple interest
totalDue      = principal + totalInterest
outstanding   = max(0, totalDue − amountRepaid)
```

A loan becomes `repaid` **only** when `amountRepaid ≥ totalDue`
(`loans_notifier.dart:112`), so repaid loans always have `outstanding = 0`.

**There is no repayment schedule / next-due-date stored.** "Next repayment" is
not reliably derivable and is therefore not shown.

### `/groups/{g}/repayments/{id}` — `RepaymentDto`

`id, loanId, memberId, memberName, amount (may be negative for a reversal),
date, notes?, reversalOf?, createdAt, updatedAt, schemaVersion`

### `/groups/{g}/meetings/{id}` — `MeetingDto`

`id, date, period, attendeeIds (member ids), totalMembers, savingsCollected,
loansDisbursed, loansRepaid, extraIncome, moneySpent, extraIncomeDesc?,
moneySpentDesc?, createdAt, updatedAt, schemaVersion`

### `/groups/{g}/monthlyClosures/{period}` — `MonthlyClosureDto`

`period, statusIndex (0 open, 1 closed, 2 reopened), closingBalance,
totalSavings, totalLoanRepayments, totalInterest, totalExpenses,
totalOtherIncome, closedAt?, closedBy?, reopenedAt?, reopenedBy?, notes?, …`

### `/groups/{g}/openingBalance/current`, `/groups/{g}/openingRepayments/{id}`

Pre-app balances captured by the "Existing Group Savings" wizard. The wizard
never creates `savings` or `loans` documents, so opening and recorded money are
disjoint and the app **adds** them for its all-time figures (see §10). Besides
group totals, the document holds per-member maps keyed by **member document id**:
`memberSavings`, `memberLoanTaken`, `memberLoanBalance` (+ immutable
`memberLoanBalanceOriginal`), `memberLateFeesDue` (+ `…Original`),
`memberLateFeesPaid`, `memberInterestPaid`. `openingRepayments.kind` ∈
`loan | lateFee | interest` (absent → `loan`).

## 5. Relationships

```
group ──< members          (members.id)
group ──< savings          savings.memberId    → members.id
group ──< loans            loans.memberId      → members.id
loan  ──< repayments       repayments.loanId   → loans.id
                           repayments.memberId → members.id
group ──< meetings         meetings.attendeeIds[] → members.id
group ──< openingRepayments.memberId → members.id
```

- All relationships are **within one group**. No document stores its
  `groupId`. The group is known only from the document path. In
  collection-group queries the dashboard derives it from `doc.ref.parent.parent.id`.
- `memberName` is **denormalised** onto savings/loans/repayments, so
  transaction tables can show names without joins.

### What "transactions" means

SHG has **no single transactions collection**. The console's transaction
browser covers the money-movement records that exist:

| Console type | Source |
|---|---|
| Savings payment (or reversal if amount < 0) | `savings` |
| Loan repayment (or reversal if amount < 0) | `repayments` |
| Opening loan repayment / late fee payment / loan interest | `openingRepayments` (`kind` loan / lateFee / interest) |
| Late fine | `monthlyCharges` (`kind` lateFee) |

A loan disbursement is money paid **out**, not a payment: it is listed on Loans,
in member history and in reports, never among transactions.

Meeting-level `extraIncome` / `moneySpent` are per-meeting totals, not
individual transactions. They appear on the Meetings view instead.

### Employees

**The SHG data model has no employees, field officers or staff.** Nothing in
`lib/` or the rules mentions them. The Employees page is a documented
placeholder until a data source exists.

## 6. Security rules relevant to the dashboard

Summary of `firestore.rules` (production):

| Path | Read allowed for |
|---|---|
| `/groups/{g}` and **every** subcollection | `isGroupAdmin(g)` **or** `isApprovedMember(g)` only |
| `/memberUids`, `/joinRequests` | group admin (or the owning user) |
| `/users/{uid}` | that user only |
| `/system/config` | any signed-in user |
| everything else | denied (`match /{document=**} { allow read, write: if false; }`) |

Consequences:

1. **An Ozey internal user can read nothing** unless they happen to be an
   approved member of a group, and even then only that one group.
2. **Listing `/groups` fails for everyone.** The read rule calls
   `get(/groups/$(groupId))` on the wildcard, and Firestore cannot prove that
   for a collection query.
3. **Collection-group queries** (all savings / loans / members across groups)
   **fail for everyone**. No `match /{path=**}/…` rules exist.

**The console cannot work against the current rules.** This is intentional:
the dashboard does **not** weaken or work around them. See §7 for the change
it needs.

## 7. Required rules change (proposed, NOT deployed)

> **Superseded, do not deploy.** The `ozeyStaff` claim design below is
> replaced by product-scoped workforce permissions (`shg:read`, …) issued via
> the Ozey Workforce identity. See
> [OZEY_WORKFORCE_ARCHITECTURE.md §7](OZEY_WORKFORCE_ARCHITECTURE.md). This
> section, `firebase/firestore.rules.proposed*` and
> `firebase/staff-access.rules.test.mjs` are kept only as the record of the
> emulator-verified baseline (159/159 existing SHG tests unaffected).

The goal is additive, read-only access for verified Ozey staff. App users see
no behavioural change.

**Authority:** a Firebase Auth **custom claim** `ozeyStaff: true`. Custom
claims can only be set with the Admin SDK (server/CLI, service account).
Clients cannot forge them, and the rules verify them from the signed ID token
at no read cost. This is the server-side authorization boundary. The
dashboard's own client-side check only decides what the UI shows.

Emulator-verified: the existing SHG suite still passes 159/159 on the proposed
rules, and `firebase/staff-access.rules.test.mjs` adds 27 tests for the new
access. The full proposed diff is in
[`firebase/firestore.rules.proposed.diff`](firebase/firestore.rules.proposed.diff).
In short:

```
function isOzeyStaff() {
  return isSignedIn() && request.auth.token.ozeyStaff == true;
}
```

- `allow read: if isOzeyStaff() || isAdminOrMember(groupId);` on `groups`,
  `members`, `savings`, `loans`, `repayments`, `meetings`,
  `monthlyClosures`, `openingBalance`, `openingRepayments`.
  `isOzeyStaff()` is evaluated first, so staff reads don't pay for the
  `get()` in `isGroupAdmin`. The result for non-staff is unchanged.
- New **read-only** collection-group matches for the same subcollections:
  `match /{path=**}/savings/{id} { allow read: if isOzeyStaff(); }` and so on.
- **No** write rule changes. `memberUids`, `joinRequests`, `inviteCodes`
  and `users` stay closed to staff.

Rollout, done by the project owner:

1. Review the diff and run the existing emulator suite (`firestore-tests/`)
   plus a staff-read test.
2. Deploy rules: `firebase deploy --only firestore:rules` in the SHG repo.
3. Deploy indexes (§8).
4. Grant the claim to named staff with `scripts/grant-staff-claim.mjs`, using
   local Admin credentials. The script is never bundled into the web app.

## 8. Indexes

Automatic single-field indexes cover **collection-scope** queries. The
console's **collection-group** queries need collection-group-scope single-field
indexes, which Firestore does **not** create automatically. They are listed in
[`firebase/firestore.indexes.proposed.json`](firebase/firestore.indexes.proposed.json):

| Collection group | Field(s) | Used for |
|---|---|---|
| `savings`, `repayments`, `openingRepayments` | `date` | transaction browser, date filter, recent activity |
| `loans` | `disbursedAt` | loans browser, disbursements |
| `loans` | `statusIndex` | outstanding total |
| `loans` | `statusIndex` + `disbursedAt` desc (composite) | loans browser status filter |
| `meetings` | `date` | recent meetings |
| `members` | `statusIndex` | active member count |
| `members` | `name` | members browser, name search |

Collection-scope composites (`memberId` + date desc on savings, repayments,
openingRepayments and loans) back the transaction browser's member filter.

Deploy them from the SHG repo with `firebase deploy --only firestore:indexes`
after merging them into its `firestore.indexes.json`. The local emulator does
not enforce indexes, so they are verified only in production. If Firestore rejects a query for a
missing index, the console shows the error together with the index-creation
link that Firestore returns.

## 9. Ambiguities and open questions

1. **Web app + phone auth for staff.** Staff sign in with the same phone-OTP
   provider as the app. Do all intended staff have (or want) an SHG Auth
   account tied to their phone? Adding Google sign-in would be a Console
   change and needs a decision.
2. **App Check enforcement status** is unknown. If Firestore enforcement is
   on, the web app also needs a reCAPTCHA Enterprise App Check provider,
   otherwise every read fails with `permission-denied`.
3. **Opening balances vs savings.** Resolved, see §10: the app's own totals
   add opening and recorded money, and so does the console.
4. **Members who left.** Rules require `statusIndex == 0` on create, but
   `MemberDto` carries `leftAt` / `exitTypeIndex`. Whether left members stay
   in `/members` with `statusIndex 1` or are deleted is not provable from
   rules alone. The console shows `statusIndex` as reported and counts
   "active" as `statusIndex == 0`.
5. **Pending outbox writes** on devices are invisible to the console until
   they sync.
6. **Search.** Firestore has no full-text search. Group and member search is
   case-sensitive **prefix** search on the name field. A search index
   (e.g. Typesense/Algolia) would need a separate decision.
7. **Employees / Reports:** no source data. Placeholders only.

## 10. Console financial definitions (source of truth)

Every figure is built on the server from the records below with the SHG app's
own formulas (`lib/core/services/financial_engine.dart`,
`lib/features/payments/opening_position.dart` / `opening_outstanding.dart`,
`lib/core/finance/member_account.dart`, `lib/core/finance/loan_schedule.dart`).
Pure implementations: `src/modules/shg/domain/financials.ts`, `loan-math.ts`
(unit-tested); queries: `src/lib/server/shg/core/data.ts`.

| Console figure | Definition | App equivalent |
|---|---|---|
| Groups | `groups` documents; "added in 30 days" by `createdAt` | — |
| Members | `members` with `statusIndex` 0; "joined in 30 days" by `joinedAt` | active participants |
| Group savings | `openingBalance.totalSavings` + Σ `savings.amount` with `period` ≤ current IST month (reversals included; next-month advances excluded until their month) | dashboard "Total Group Savings" = `groupTotalSavingsUpTo` + `OpeningPosition.groupSavings` |
| Savings, last 30 days | Σ `savings.amount` with payment `date` in the last 30 days | — |
| Total loans recorded | Σ `loans.principal` + `openingBalance.totalLoansGiven` | `groupTotalDisbursed` |
| Outstanding loans | Σ per-loan principal outstanding + max(0, `openingBalance.outstandingLoans` − Σ `openingRepayments[kind=loan]`) | `groupTotalPrincipalOutstanding` |
| Loan principal outstanding | principal − principal repaid, from the loan's `repayments` records: flat → paid × principal/totalDue; reducing → `LoanSchedule.allocate(paid)`; flexible → principal if nothing repaid, otherwise **not derivable** (interest charges are Hive-only) | `loanPrincipalOutstanding` |
| Loan balance due | totalDue − `amountRepaid` (principal + contractual interest) | `Loan.outstanding` |
| Loans list | every `loans` document + one "before the app" row per member in `memberLoanTaken` / `memberLoanBalance(Original)` | the two sources are disjoint by construction |
| Member savings | `memberSavings[id]` + `members.totalSavings` | `MemberAccountSummary.savings` |
| Member loans taken | `memberLoanTaken[id]` + Σ the member's `loans.principal` | `totalLoanTakenTillDate` |
| Member opening loan owed | original present: max(0, `memberLoanBalanceOriginal[id]` − Σ `openingRepayments[kind=loan, id]`); else legacy `memberLoanBalance[id]` | `OpeningOutstanding.loanFor` |
| Member interest paid | `memberInterestPaid[id]` + Σ `openingRepayments[kind=interest, id]` | `openingInterestPaid` |
| Member fines | opening late fee owed (`OpeningOutstanding.lateFeeFor`); opening late fees paid (`memberLateFeesPaid[id]` + Σ `openingRepayments[kind=lateFee, id]`); monthly late fines paid (Σ `monthlyCharges[kind=lateFee, id]`) | `MemberAccountSummary` |
| Member history | the member's `savings`, `repayments`, `openingRepayments`, `monthlyCharges`, `loans` (as "loan given") + one entry per non-zero opening allocation, dated at `openingBalance.createdAt` | — |
| Transactions | `savings`, `repayments`, `openingRepayments`, `monthlyCharges` (payments only) | — |
| Meetings / Reports | `meetings`; `monthlyClosures` + `ruleVersions` (unchanged) | — |

Every `memberId` and every opening-map key is a **member document id**, never
an Auth uid (verified in production: 12/12 keys match member ids, 0 match uids).

**Not derivable from cloud data** (shown explicitly, never estimated):
flexible-loan interest, total due and, once repaid in part, principal
outstanding (`LoanInterestCharge` lives only in on-device Hive); payments still
in a device's outbox.

**Index constraint.** `ozey-shg` has no composite indexes. A `sum()`
aggregation filtered on another field needs one, so savings buckets use an
unfiltered `sum()` plus single-field range reads.

### Production reconciliation (2026-10-03, read-only)

`node scripts/shg-reconcile.ts`: 25/25 checks. One group ("Sahyogi Sarthi
Bachat Gat"), 12 active members. It has **no** `savings`, `repayments`,
`openingRepayments`, `monthlyCharges`, `meetings` or `monthlyClosures`
documents yet; its money is in `openingBalance/current` (schema v2) plus two
in-app loans:

| Figure | Value | From |
|---|---|---|
| Savings | ₹5,28,000 | opening ₹5,28,000 (= Σ 12 × ₹44,000 `memberSavings`) + recorded ₹0 |
| Total loans recorded | ₹6,35,000 | opening ₹4,60,000 (= Σ `memberLoanTaken`) + in-app ₹1,75,000 (2 reducing-balance EMI loans) |
| Outstanding (principal) | ₹4,79,000 | opening ₹3,04,000 (= Σ `memberLoanBalanceOriginal`, nothing collected yet) + in-app ₹1,75,000 (nothing repaid) |
| Interest paid before the app | ₹38,800 | = Σ `memberInterestPaid` (not savings) |
| Other income / expense | ₹3,091 / ₹165.20 | opening balance only |

The ₹5,28,000 opening figure is **savings** (`totalSavings`, matching
`memberSavings`); interest collected, other income and loans are separate
fields and are never counted as savings. The member page previously showed ₹0
because it summed only `savings` records (none exist) and ignored
`memberSavings`; there was no id, path or pagination fault.
