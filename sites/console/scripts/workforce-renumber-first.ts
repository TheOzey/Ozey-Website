#!/usr/bin/env node
// One-off, owner-approved correction: give `--email` the number EMP-0001 by
// moving the current holder of EMP-0001 to EMP-0002.
//
//   node scripts/workforce-renumber-first.ts --project <id> --email <employee email>         # dry run (default)
//   node scripts/workforce-renumber-first.ts --project <id> --email <employee email> --yes   # apply
//
// Employee IDs are otherwise permanent. This exists only because EMP-0001 was
// issued (through Add employee) before the original employees were numbered.
// It refuses to run unless Workforce is in exactly that state:
//   - counters/employees.next is 2 and exactly one employee is numbered (EMP-0001)
//   - that holder has never signed in (status "invited", no authUid)
//   - `--email` identifies exactly one employee, who has no number and is not offboarded
// The apply step re-checks all of this inside ONE transaction that moves the
// holder to EMP-0002, gives `--email` EMP-0001, sets the counter to 3 and appends
// audit entries ("employee-number-corrected", "employee-number-assigned").
// The holder's original "employee-created" entry (EMP-0001) is left untouched:
// the audit log is append-only and the correction entry records the move.
// Only employeeNumber / updatedAt / updatedBy change; nothing else is touched.

import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { FieldValue, Firestore, type Transaction } from "@google-cloud/firestore";
import { OAuth2Client } from "google-auth-library";

const ALLOWED_PROJECTS = ["project-5dedabbe-2c9d-433a-a40", "demo-ozey-workforce"];
const ACTOR = "correction-script";
const REASON = "EMP-0001 reassigned to the first (seeded) employee, with the owner's approval; the holder had not signed in.";

const { values } = parseArgs({
  options: { project: { type: "string" }, email: { type: "string" }, yes: { type: "boolean", default: false } },
});
const project = values.project ?? "";
const email = (values.email ?? "").trim().toLowerCase();
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const fail = (m: string): never => {
  console.error(`error: ${m}`);
  process.exit(1);
};
if (!ALLOWED_PROJECTS.includes(project)) fail(`--project must be one of ${ALLOWED_PROJECTS.join(", ")}`);
if (emulator !== project.startsWith("demo-")) fail("demo- projects only with the emulator; real projects only without it");
if (!email) fail("--email is required");

const authClient = new OAuth2Client();
authClient.refreshHandler = async () => ({
  access_token: execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim(),
  expiry_date: Date.now() + 45 * 60 * 1000,
});
const db = new Firestore({ projectId: project, ...(emulator ? {} : { authClient }) });
const counterRef = db.doc("counters/employees");

/** Reads and checks the exact expected state; throws a readable error otherwise. */
async function plan(tx?: Transaction) {
  const numberedQ = db.collection("employees").where("employeeNumber", ">=", "EMP-");
  const targetQ = db.collection("employees").where("email", "==", email).limit(2);
  const [counter, numbered, target] = tx
    ? await Promise.all([tx.get(counterRef), tx.get(numberedQ), tx.get(targetQ)])
    : await Promise.all([counterRef.get(), numberedQ.get(), targetQ.get()]);
  const problems: string[] = [];
  if (counter.get("next") !== 2) problems.push(`counter is ${counter.get("next")}, expected 2`);
  if (numbered.size !== 1 || numbered.docs[0].get("employeeNumber") !== "EMP-0001") {
    problems.push(`expected exactly one numbered employee (EMP-0001), found ${numbered.docs.map((d) => d.get("employeeNumber")).join(", ") || "none"}`);
  }
  const holder = numbered.docs[0];
  if (holder && (holder.get("status") !== "invited" || holder.get("authUid"))) problems.push("the EMP-0001 holder has signed in or is not invited");
  if (target.size !== 1) problems.push(`--email matches ${target.size} employees, expected 1`);
  const person = target.docs[0];
  if (person && person.get("employeeNumber")) problems.push(`${email} already has ${person.get("employeeNumber")}`);
  if (person && person.get("status") === "offboarded") problems.push(`${email} is offboarded`);
  if (holder && person && holder.id === person.id) problems.push("--email is already the EMP-0001 holder");
  if (problems.length) throw new Error(`refusing: ${problems.join("; ")}`);
  return { holder, person };
}

const { holder, person } = await plan().catch((e: Error) => fail(e.message));
console.log(`Project: ${project}${emulator ? "  (emulator)" : "  (credentials: gcloud)"}`);
console.log("Planned correction (one transaction):");
console.log(`  ${person.get("email")}  "${person.get("displayName")}"  (no number) → EMP-0001`);
console.log(`  ${holder.get("email")}  "${holder.get("displayName")}"  EMP-0001 → EMP-0002`);
console.log("  counters/employees.next: 2 → 3");
console.log(`  auditLog: employee-number-corrected (${holder.get("email")}), employee-number-assigned (${person.get("email")})`);
if (!values.yes) {
  console.log("\nDry run. Re-run with --yes to apply.");
  process.exit(0);
}

await db.runTransaction(async (tx) => {
  const { holder: h, person: p } = await plan(tx); // re-check inside the transaction
  const now = FieldValue.serverTimestamp();
  tx.update(h.ref, { employeeNumber: "EMP-0002", updatedAt: now, updatedBy: ACTOR });
  tx.update(p.ref, { employeeNumber: "EMP-0001", updatedAt: now, updatedBy: ACTOR });
  tx.set(counterRef, { next: 3, updatedAt: now }, { merge: true });
  tx.create(db.collection("auditLog").doc(), {
    at: now, action: "employee-number-corrected", actor: ACTOR, target: h.id, from: "EMP-0001", to: "EMP-0002", reason: REASON,
  });
  tx.create(db.collection("auditLog").doc(), { at: now, action: "employee-number-assigned", actor: ACTOR, target: p.id, employeeNumber: "EMP-0001" });
});
console.log("\nApplied.");
await db.terminate();
