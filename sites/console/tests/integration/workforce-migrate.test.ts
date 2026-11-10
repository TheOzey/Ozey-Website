// Workforce migration tests (EMULATOR ONLY), run after employees.test.ts by
// tests/integration/run.sh. At that point the emulator holds legacy employees
// without numbers (the seeded emp_reader / emp_noshg / emp_viewer) next to
// API-created ones with numbers (one deleted), and roles without displayName —
// the same shape as Workforce Dev before the migration.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Firestore } from "@google-cloud/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Refusing: FIRESTORE_EMULATOR_HOST is not set");

const run = promisify(execFile);
const CONSOLE_DIR = fileURLToPath(new URL("../..", import.meta.url));
const BASE = `${process.env.CONSOLE_URL ?? "http://localhost:3100"}/dashboard`;
const ORIGIN = new URL(BASE).origin;
const workforce = new Firestore({ projectId: "demo-ozey-workforce" });

async function migrate(...args: string[]) {
  try {
    const { stdout } = await run("node", ["scripts/workforce-migrate.ts", "--project", "demo-ozey-workforce", ...args], { cwd: CONSOLE_DIR, env: process.env });
    return { code: 0, out: stdout };
  } catch (e) {
    const err = e as { code: number; stdout: string; stderr: string };
    return { code: err.code, out: err.stdout + err.stderr };
  }
}

async function signIn(email: string) {
  const idp = JSON.stringify({ sub: `g-${email}`, email, email_verified: true });
  const token = await fetch("http://127.0.0.1:9299/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postBody: `id_token=${encodeURIComponent(idp)}&providerId=google.com`, requestUri: "http://localhost", returnSecureToken: true }),
  }).then((r) => r.json() as Promise<{ idToken: string }>);
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token.idToken }),
  });
  return res.headers.get("set-cookie")?.split(";")[0] ?? "";
}

const create = (body: unknown, cookie: string) =>
  fetch(`${BASE}/api/employees`, { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie }, body: JSON.stringify(body) }).then(
    async (r) => ({ status: r.status, body: (await r.json()) as any }),
  );

/** Every field the migration must never change, per employee. */
async function identities() {
  const docs = (await workforce.collection("employees").get()).docs;
  return Object.fromEntries(
    docs.map((d) => [d.id, JSON.stringify([d.get("email"), d.get("authUid"), d.get("status"), d.get("roles"), d.get("displayName"), d.get("createdAt")?.toMillis?.() ?? null])]),
  );
}
const numbers = async () =>
  Object.fromEntries((await workforce.collection("employees").get()).docs.map((d) => [d.id, d.get("employeeNumber") ?? null]));
const auditCount = async (action: string) => (await workforce.collection("auditLog").where("action", "==", action).count().get()).data().count;
const counter = async () => (await workforce.doc("counters/employees").get()).get("next");

let admin = "";
let viewer = "";
before(async () => {
  admin = await signIn("reader@example.test");
  viewer = await signIn("viewer@example.test");
});
after(() => workforce.terminate());

describe("employee number + role display name migration", () => {
  let identityBefore: Record<string, string> = {};
  let numbersBefore: Record<string, string | null> = {};
  let counterBefore = 0;

  test("refuses a real project while pointed at the emulator", async () => {
    const res = await migrate("--project", "project-5dedabbe-2c9d-433a-a40");
    assert.notEqual(res.code, 0);
  });

  test("dry run (default) prints the plan and writes nothing", async () => {
    identityBefore = await identities();
    numbersBefore = await numbers();
    counterBefore = await counter();
    const legacy = Object.entries(numbersBefore).filter(([, n]) => n === null).map(([id]) => id);
    assert.deepEqual(legacy.sort(), ["emp_noshg", "emp_reader", "emp_viewer"]);

    const res = await migrate();
    assert.equal(res.code, 0, res.out);
    assert.match(res.out, /Employee numbers \(3 to assign/);
    assert.match(res.out, /roles\/console-admin {2}displayName = "Console Administrator"/);
    assert.match(res.out, /roles\/shg-viewer {2}displayName = "SHG Viewer"/);
    assert.match(res.out, /Dry run/);
    assert.deepEqual(await numbers(), numbersBefore);
    assert.equal(await counter(), counterBefore);
    assert.equal((await workforce.doc("roles/console-admin").get()).get("displayName"), undefined);
  });

  test("apply: every employee numbered, unique, after every number ever issued; identity fields untouched; audited", async () => {
    const res = await migrate("--yes");
    assert.equal(res.code, 0, res.out);
    const after = await numbers();
    const values = Object.values(after);
    assert.ok(values.every((n) => typeof n === "string" && /^EMP-\d{4,}$/.test(n)), JSON.stringify(after));
    assert.equal(new Set(values).size, values.length, "unique");
    // Existing numbers are kept exactly.
    for (const [id, n] of Object.entries(numbersBefore)) if (n) assert.equal(after[id], n, id);
    // New numbers continue after the counter (which already skipped the deleted employee's number).
    const assigned = ["emp_noshg", "emp_reader", "emp_viewer"].map((id) => Number(after[id]!.slice(4))).sort((a, b) => a - b);
    assert.deepEqual(assigned, [counterBefore, counterBefore + 1, counterBefore + 2]);
    assert.equal(await counter(), counterBefore + 3);
    // Nothing that identifies or authorises an employee changed.
    assert.deepEqual(await identities(), identityBefore);
    assert.equal(await auditCount("employee-number-assigned"), 3);
    assert.equal((await workforce.doc("roles/console-admin").get()).get("displayName"), "Console Administrator");
    assert.equal((await workforce.doc("roles/shg-viewer").get()).get("displayName"), "SHG Viewer");
    assert.equal(await auditCount("role-display-name-set"), 2);
  });

  test("rerun: nothing to do, nothing changes", async () => {
    const snapshot = await numbers();
    const c = await counter();
    const res = await migrate("--yes");
    assert.equal(res.code, 0, res.out);
    assert.match(res.out, /Nothing to do/);
    assert.deepEqual(await numbers(), snapshot);
    assert.equal(await counter(), c);
    assert.equal(await auditCount("employee-number-assigned"), 3);
    assert.equal(await auditCount("role-display-name-set"), 2);
  });

  test("a renamed role keeps its name on rerun (never overwritten)", async () => {
    await workforce.doc("roles/shg-viewer").update({ displayName: "SHG Read-only" });
    const res = await migrate("--yes");
    assert.match(res.out, /Nothing to do/);
    assert.equal((await workforce.doc("roles/shg-viewer").get()).get("displayName"), "SHG Read-only");
    await workforce.doc("roles/shg-viewer").update({ displayName: "SHG Viewer" });
  });

  test("creation after the migration continues the sequence without collisions", async () => {
    const res = await create({ firstName: "After", lastName: "Migration", email: "after.migration@example.test", roles: ["shg-viewer"] }, admin);
    assert.equal(res.status, 201);
    const all = Object.values(await numbers());
    assert.equal(new Set(all).size, all.length);
    assert.equal(Number(res.body.employee.employeeNumber.slice(4)), counterBefore + 3);
  });
});

describe("role display names are display-only; authorization uses role ids", () => {
  test("the form shows display names; the directory shows them and every employee's number", async () => {
    const form = await (await fetch(`${BASE}/employees/new`, { headers: { Cookie: admin } })).text();
    assert.ok(form.includes("Console Administrator") && form.includes("SHG Viewer"));
    const dir = await (await fetch(`${BASE}/employees`, { headers: { Cookie: admin } })).text();
    assert.ok(dir.includes("Console Administrator") && !dir.includes("Not assigned"));
  });

  test("employees keep storing role ids; a display name is not accepted as a role", async () => {
    const res = await create({ firstName: "Name", lastName: "AsRole", email: "name.as.role@example.test", roles: ["Console Administrator"] }, admin);
    assert.equal(res.status, 400);
    const stored = (await workforce.collection("employees").where("email", "==", "after.migration@example.test").get()).docs[0];
    assert.deepEqual(stored.get("roles"), ["shg-viewer"]);
  });

  test("permissions still come from the role id: a role named 'Console Administrator' grants nothing by its name", async () => {
    // An impostor role whose NAME claims admin but whose permissions are SHG-only.
    await workforce.doc("roles/impostor").set({ displayName: "Console Administrator", product: "shg", permissions: ["shg:read"] });
    await workforce.collection("employees").where("email", "==", "viewer@example.test").get().then((s) => s.docs[0].ref.update({ roles: ["impostor"] }));
    const impostor = await signIn("viewer@example.test"); // fresh session: permissions re-resolved from role ids
    const res = await create({ firstName: "Should", lastName: "Fail", email: "should.fail@example.test", roles: ["shg-viewer"] }, impostor);
    assert.equal(res.status, 403);
    assert.equal(res.body.error, "missing-permission");
    // SHG access still works through the role id's permissions.
    assert.equal((await fetch(`${BASE}/api/shg/overview`, { headers: { Cookie: impostor } })).status, 200);
    await workforce.collection("employees").where("email", "==", "viewer@example.test").get().then((s) => s.docs[0].ref.update({ roles: ["shg-viewer"] }));
    await workforce.doc("roles/impostor").delete();
    assert.ok(viewer);
  });

  test("the admin still has both permissions after the migration (ids unchanged)", async () => {
    const fresh = await signIn("reader@example.test");
    assert.equal((await fetch(`${BASE}/api/shg/overview`, { headers: { Cookie: fresh } })).status, 200);
    assert.equal((await create({ firstName: "Still", lastName: "Admin", email: "still.admin@example.test", roles: ["console-admin"] }, fresh)).status, 201);
  });
});
