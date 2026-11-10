# Ozey Workforce (identity backend)

The employee identity project behind the Ozey Console. The design is in
[`sites/console/OZEY_WORKFORCE_ARCHITECTURE.md`](../sites/console/OZEY_WORKFORCE_ARCHITECTURE.md).

```
workforce/
  firebase.json            Firestore rules + blocking functions + emulator ports
  .firebaserc              aliases: only `dev` → ozey-workforce-dev (no production alias yet)
  firestore.rules          deny-all: every collection is server-only
  functions/               Identity Platform blocking functions (Node 22, asia-south1)
    src/gate.ts            admission rules (pure, unit-tested)
    src/index.ts           workforceBeforeCreate / workforceBeforeSignIn
    .env                   admission policy (V1: employee-record allowlist)
    .env.ozey-workforce-dev  FUNCTIONS_SERVICE_ACCOUNT for the dev project
    .env.local             emulator-only values
  scripts/seed-dev.mjs     products, roles, first employee (dry run by default)
```

This package never touches `ozey-shg`: no SHG credentials, rules, users or data.

---

## Local (emulators, no cloud)

```bash
cd workforce/functions && pnpm install && pnpm test            # 15 gate tests
cd .. && firebase emulators:start --only auth,firestore,functions --project demo-ozey-workforce
FIRESTORE_EMULATOR_HOST=127.0.0.1:8280 node scripts/seed-dev.mjs --project demo-ozey-workforce --email web.viru@gmail.com --yes
```

Run the console against it (see `sites/console/.env.example`, "workforce emulators").
The emulator's fake Google provider cannot issue the `hd` claim, so the
managed-account check (off in V1 anyway) is always skipped in the emulator.

---

## Setting up `ozey-workforce-dev` (not yet done)

**Identity decision (V1):** the console's first and only administrator is the
existing Ozey Google account **`web.viru@gmail.com`**. There is no Cloud
Identity, no Workspace, no organization changes and no DNS changes. The
project follows the `ozey-shg` model: no organization parent, owned by
`web.viru@gmail.com`, billed to "Firebase Payment". Admission is the employee
record allowlist (`WORKFORCE_ALLOWED_EMAIL_DOMAINS=any`,
`WORKFORCE_REQUIRE_MANAGED_ACCOUNT=false`), plus the OAuth consent screen's
test-user list.

**Blocked on:** project quota for `web.viru@gmail.com` (all slots used).
Request an increase at https://support.google.com/code/contact/project_quota_increase.

### Commands (as web.viru@gmail.com, once quota is available)

```bash
P=ozey-workforce-dev; BILLING=01B5F1-DFD9F4-FCD262   # "Firebase Payment"

# 1 project (no organization, like ozey-shg) + Blaze billing
gcloud projects create $P --name="Ozey Workforce Dev" --labels=env=dev,system=ozey-workforce
gcloud billing projects link $P --billing-account=$BILLING
# + budget alert ≈ ₹500/month (Cloud Billing → Budgets)

# 2 APIs
gcloud services enable firebase.googleapis.com identitytoolkit.googleapis.com firestore.googleapis.com \
  cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  eventarc.googleapis.com iamcredentials.googleapis.com --project $P

# 3 Firebase + Identity Platform
firebase projects:addfirebase $P
curl -X POST -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "x-goog-user-project: $P" \
  "https://identitytoolkit.googleapis.com/v2/projects/$P/identityPlatform:initializeAuth"

# 4 Firestore (Mumbai) — deny-all rules are deployed in step 7
gcloud firestore databases create --location=asia-south1 --project $P

# 5 console web app
firebase apps:create web ozey-console-dev --project $P          # then: firebase apps:sdkconfig web <appId>

# 6 service accounts (least privilege, no keys)
gcloud iam service-accounts create console-server     --display-name="Ozey Console server"     --project $P
gcloud iam service-accounts create workforce-auth-fns --display-name="Workforce auth functions" --project $P
for R in roles/firebaseauth.admin roles/datastore.user; do
  gcloud projects add-iam-policy-binding $P --member=serviceAccount:console-server@$P.iam.gserviceaccount.com --role=$R; done
for R in roles/datastore.user roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding $P --member=serviceAccount:workforce-auth-fns@$P.iam.gserviceaccount.com --role=$R; done
gcloud iam service-accounts add-iam-policy-binding console-server@$P.iam.gserviceaccount.com \
  --member=user:web.viru@gmail.com --role=roles/iam.serviceAccountTokenCreator --project $P

# 7 deny-all rules + blocking functions (registered with Identity Platform on deploy)
cd workforce && firebase deploy --only firestore:rules,functions:workforce --project dev

# 8 seed: dry run, review, then apply
gcloud auth application-default set-quota-project $P
node scripts/seed-dev.mjs --project $P --email web.viru@gmail.com
node scripts/seed-dev.mjs --project $P --email web.viru@gmail.com --yes
```

### Console steps (no API exists for these)

1. **Firebase console → Authentication → Sign-in method → Google → Enable.**
   This creates the OAuth web client. Leave every other provider disabled.
   Authorized domains: keep the defaults (`localhost`, `$P.firebaseapp.com`).
2. **Google Cloud console → Google Auth Platform → Audience:** user type
   *External*, publishing status **Testing**, test users: **only
   `web.viru@gmail.com`**. Google then refuses the consent step for every other
   account, before Firebase is reached. That's a second allowlist, independent
   of ours.
3. Make sure `web.viru@gmail.com` has **2-Step Verification** on (Google
   Account → Security). With a consumer account this is the MFA boundary, and
   Firebase cannot enforce it.

### Run the console against dev

```bash
gcloud auth application-default login --impersonate-service-account=console-server@ozey-workforce-dev.iam.gserviceaccount.com
# sites/console/.env.local: NEXT_PUBLIC_WORKFORCE_* from step 5, WORKFORCE_PROJECT_ID=ozey-workforce-dev
pnpm --filter @ozey/console dev          # http://localhost:3100/dashboard  (use a normal browser: sign-in uses a pop-up)
```

Expected: `web.viru@gmail.com` signs in. Its employee record moves invited →
active, and SHG shows "not connected". Any other Google account is stopped
by the consent screen (not a test user) and, independently, by the blocking
function (no employee record).

### Rollback

Delete the project (`gcloud projects delete ozey-workforce-dev`, 30-day
recovery window). Nothing else in Ozey depends on it.
