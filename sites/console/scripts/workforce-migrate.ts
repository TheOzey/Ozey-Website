#!/usr/bin/env node
// One-time Workforce migrations (idempotent):
//   1. employee numbers  — every employee without `employeeNumber` gets the next
//                          EMP-#### from counters/employees (oldest first)
//   2. role display names — `displayName` on known roles that have none
//
//   node scripts/workforce-migrate.ts --project <id> [--credentials gcloud]          # dry run (default)
//   node scripts/workforce-migrate.ts --project <id> [--credentials gcloud] --yes    # apply
//
// Only adds `employeeNumber` (+ updatedAt/updatedBy) to employees and
// `displayName` (+ updatedAt) to roles. Never touches the document id, email,
// authUid, status or roles, never overwrites an existing value. The apply step
// re-plans inside ONE transaction that also advances the counter and appends
// an auditLog entry per change, so it is safe against concurrent employee
// creation and safe to run again (a second run finds nothing to do).
// Refuses any project outside the allowlist, and the emulator for real projects.

import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { FieldValue, Firestore, type Transaction } from "@google-cloud/firestore";
import { OAuth2Client } from "google-auth-library";
import { planEmployeeNumbers, planRoleDisplayNames } from "../src/lib/employees/migrations.ts";

const ALLOWED_PROJECTS = ["project-5dedabbe-2c9d-433a-a40", "demo-ozey-workforce"];
const ACTOR = "migration-script";
const MAX_EMPLOYEES = 400; // one transaction: ≤ 500 writes including audit entries

const { values } = parseArgs({
  options: {
    project: { type: "string" },
    credentials: { type: "string", default: "gcloud" },
    yes: { type: "boolean", default: false },
  },
});
const project = values.project ?? "";
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (!ALLOWED_PROJECTS.includes(project)) fail(`--project must be one of ${ALLOWED_PROJECTS.join(", ")}`);
if (emulator !== project.startsWith("demo-")) fail("demo- projects only with the emulator; real projects only without it");
if (!emulator && values.credentials !== "gcloud") fail("--credentials must be gcloud for a real project");

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function gcloudAuthClient() {
  const client = new OAuth2Client();
  client.refreshHandler = async () => ({
    access_token: execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim(),
    expiry_date: Date.now() + 45 * 60 * 1000,
  });
  return client;
}

const db = new Firestore({ projectId: project, ...(emulator ? {} : { authClient: gcloudAuthClient() }) });
const counterRef = db.doc("counters/employees");

async function readState(tx?: Transaction) {
  const employeesQuery = db.collection("employees").limit(MAX_EMPLOYEES + 1);
  const rolesQuery = db.collection("roles");
  const [employees, roles, counter] = tx
    ? await Promise.all([tx.get(employeesQuery), tx.get(rolesQuery), tx.get(counterRef)])
    : await Promise.all([employeesQuery.get(), rolesQuery.get(), counterRef.get()]);
  if (employees.size > MAX_EMPLOYEES) fail(`more than ${MAX_EMPLOYEES} employees: split the migration`);
  const numbering = planEmployeeNumbers(
    employees.docs.map((d) => ({ id: d.id, employeeNumber: d.get("employeeNumber"), createdAt: d.get("createdAt")?.toDate?.() ?? null })),
    counter.get("next"),
  );
  const naming = planRoleDisplayNames(roles.docs.map((d) => ({ id: d.id, displayName: d.get("displayName") })));
  return { employees, counterNext: counter.get("next") ?? null, numbering, naming };
}

const state = await readState();
const byId = new Map(state.employees.docs.map((d) => [d.id, d]));
console.log(`Project: ${project}${emulator ? "  (emulator)" : "  (credentials: gcloud)"}`);
console.log(`counters/employees.next: ${state.counterNext ?? "(absent)"} → ${state.numbering.nextCounter}`);

console.log(`\nEmployee numbers (${state.numbering.assignments.length} to assign; ${state.employees.size - state.numbering.assignments.length} already numbered):`);
for (const a of state.numbering.assignments) {
  const d = byId.get(a.id)!;
  const created = d.get("createdAt")?.toDate?.().toISOString().slice(0, 10) ?? "unknown";
  console.log(`  ${a.employeeNumber}  ${String(d.get("email") ?? "")}  "${String(d.get("displayName") ?? "")}"  status=${d.get("status")}  created ${created}`);
}
for (const id of state.numbering.malformed) console.log(`  WARNING: ${byId.get(id)?.get("email")} has a malformed employeeNumber; left unchanged`);

console.log(`\nRole display names (${state.naming.set.length} to set):`);
for (const r of state.naming.set) console.log(`  roles/${r.id}  displayName = "${r.displayName}"`);
for (const id of state.naming.unnamed) console.log(`  roles/${id}  no known display name; the Console will show the id`);

if (state.numbering.assignments.length === 0 && state.naming.set.length === 0) {
  console.log("\nNothing to do.");
  process.exit(0);
}
if (!values.yes) {
  console.log("\nDry run. Re-run with --yes to apply.");
  process.exit(0);
}

const applied = await db.runTransaction(async (tx) => {
  // Re-plan from transactional reads: the applied plan is exactly what is current.
  const { numbering, naming } = await readState(tx);
  const now = FieldValue.serverTimestamp();
  for (const a of numbering.assignments) {
    tx.update(db.collection("employees").doc(a.id), { employeeNumber: a.employeeNumber, updatedAt: now, updatedBy: ACTOR });
    tx.create(db.collection("auditLog").doc(), { at: now, action: "employee-number-assigned", actor: ACTOR, target: a.id, employeeNumber: a.employeeNumber });
  }
  if (numbering.assignments.length > 0) tx.set(counterRef, { next: numbering.nextCounter, updatedAt: now }, { merge: true });
  for (const r of naming.set) {
    tx.update(db.collection("roles").doc(r.id), { displayName: r.displayName, updatedAt: now });
    tx.create(db.collection("auditLog").doc(), { at: now, action: "role-display-name-set", actor: ACTOR, target: r.id, displayName: r.displayName });
  }
  return { numbers: numbering.assignments.length, roles: naming.set.length };
});
console.log(`\nApplied: ${applied.numbers} employee numbers, ${applied.roles} role display names.`);
await db.terminate();
