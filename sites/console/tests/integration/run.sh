#!/bin/bash
# EMULATOR-ONLY integration tests for the console. Never touches real projects:
# every Firebase id is a demo- project served by the local emulators.
#   Phase 1: the Workforce session suite (fresh emulator).
#   Phase 2: the SHG read API suite and the employee-management suite (fresh emulator, synthetic fixtures).
# Requires Java 21 and firebase-tools. Uses ports 3100, 3101, 9299, 8280.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
CONSOLE="$(cd "$HERE/../.." && pwd)"
WORKFORCE="$(cd "$CONSOLE/../../workforce" && pwd)"
LOG="$(mktemp -d)"
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"

EMU_ENV=(
  NEXT_PUBLIC_WORKFORCE_FIREBASE_API_KEY=demo-key
  NEXT_PUBLIC_WORKFORCE_FIREBASE_AUTH_DOMAIN=demo-ozey-workforce.firebaseapp.com
  NEXT_PUBLIC_WORKFORCE_FIREBASE_PROJECT_ID=demo-ozey-workforce
  NEXT_PUBLIC_WORKFORCE_FIREBASE_APP_ID=1:000000000000:web:0000000000000000
  NEXT_PUBLIC_WORKFORCE_USE_EMULATORS=true
  WORKFORCE_PROJECT_ID=demo-ozey-workforce
  FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9299
  FIRESTORE_EMULATOR_HOST=127.0.0.1:8280
)

stop_all() {
  pkill -f "next dev --port 3100" 2>/dev/null; pkill -f "next start --port 3101" 2>/dev/null; pkill -f next-server 2>/dev/null
  pkill -f "emulators:start --only auth,firestore" 2>/dev/null; sleep 2; pkill -f cloud-firestore-emulator 2>/dev/null
  rm -f "$WORKFORCE/firestore-debug.log" "$CONSOLE/firestore-debug.log"
}
trap stop_all EXIT
wait_for() { for _ in $(seq 1 120); do eval "$1" >/dev/null 2>&1 && return 0; sleep 1; done; echo "timeout: $1"; return 1; }
start_emulators() {
  (cd "$WORKFORCE" && firebase emulators:start --only auth,firestore --project demo-ozey-workforce >"$LOG/emu-$1.log" 2>&1 &)
  wait_for "grep -q 'All emulators ready' '$LOG/emu-$1.log'"
}
start_dev() {
  (cd "$CONSOLE" && env "${EMU_ENV[@]}" "$@" pnpm exec next dev --port 3100 >"$LOG/dev.log" 2>&1 &)
  wait_for "curl -sf -o /dev/null http://localhost:3100/dashboard/login"
}
status=0

echo "== Phase 1: Workforce session suite"
stop_all
start_emulators 1
(cd "$WORKFORCE" && FIRESTORE_EMULATOR_HOST=127.0.0.1:8280 node scripts/seed-dev.mjs --project demo-ozey-workforce --email web.viru@gmail.com --yes >/dev/null)
start_dev
bash "$HERE/workforce-session.sh" || status=1
stop_all

echo "== Phase 2: SHG read API suite"
start_emulators 2
(cd "$CONSOLE" && FIRESTORE_EMULATOR_HOST=127.0.0.1:8280 node "$HERE/seed-emulator.ts") || status=1
# Credential-failure server: default impersonation source, but no real caller identity.
(cd "$CONSOLE" && env "${EMU_ENV[@]}" pnpm exec next start --port 3101 >"$LOG/fail.log" 2>&1 &)
wait_for "curl -sf -o /dev/null http://localhost:3101/dashboard/login"
start_dev SHG_DATA_SOURCE=emulator SHG_EMULATOR_PROJECT_ID=demo-ozey-shg
(cd "$CONSOLE" && FIRESTORE_EMULATOR_HOST=127.0.0.1:8280 CONSOLE_URL=http://localhost:3100 CREDENTIAL_FAIL_URL=http://localhost:3101 \
  node --test --test-concurrency=1 "$HERE/shg-api.test.ts" "$HERE/employees.test.ts" "$HERE/partners.test.ts" "$HERE/workforce-migrate.test.ts") || status=1

echo "logs: $LOG"
exit $status
