// Employee-management integration tests (EMULATOR ONLY). Run via tests/integration/run.sh
// against the console started with the Workforce Auth + Firestore emulators
// (demo-ozey-workforce). The direct Firestore client below reads (and, for one
// test, deletes) emulator documents only, to verify what the API wrote.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { Firestore } from "@google-cloud/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Refusing: FIRESTORE_EMULATOR_HOST is not set");

const BASE = `${process.env.CONSOLE_URL ?? "http://localhost:3100"}/dashboard`;
const ORIGIN = new URL(BASE).origin;
const workforce = new Firestore({ projectId: "demo-ozey-workforce" });

async function googleSignIn(email: string): Promise<string> {
  const idp = JSON.stringify({ sub: `g-${email}`, email, email_verified: true });
  const res = await fetch("http://127.0.0.1:9299/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postBody: `id_token=${encodeURIComponent(idp)}&providerId=google.com`, requestUri: "http://localhost", returnSecureToken: true }),
  });
  return ((await res.json()) as { idToken: string }).idToken;
}

async function signIn(email: string) {
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: await googleSignIn(email) }),
  });
  return { status: res.status, cookie: res.headers.get("set-cookie")?.split(";")[0] ?? "" };
}

async function create(body: unknown, cookie?: string, origin: string | null = ORIGIN) {
  const res = await fetch(`${BASE}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? (JSON.parse(text) as any) : null };
}

const page = async (path: string, cookie: string) => (await fetch(`${BASE}${path}`, { headers: { Cookie: cookie } })).text();
const employeeCount = async () => (await workforce.collection("employees").count().get()).data().count;
const byEmail = async (email: string) => (await workforce.collection("employees").where("email", "==", email).get()).docs;

const person = (n: number, over: Record<string, unknown> = {}) => ({
  firstName: "Test",
  lastName: `Person ${n}`,
  email: `person${n}@example.test`,
  roles: ["shg-viewer"],
  ...over,
});

let admin = "";
let viewer = "";

before(async () => {
  admin = (await signIn("reader@example.test")).cookie; // console-admin + shg-viewer
  viewer = (await signIn("viewer@example.test")).cookie; // shg-viewer only
  assert.ok(admin && viewer);
});
after(() => workforce.terminate());

describe("authorization (server-side, independent of the UI)", () => {
  test("no session → 401; nothing written", async () => {
    const before = await employeeCount();
    assert.equal((await create(person(900))).status, 401);
    assert.equal(await employeeCount(), before);
  });
  test("cross-origin or missing Origin → 403 even with an admin session", async () => {
    assert.equal((await create(person(901), admin, "https://evil.example")).status, 403);
    assert.equal((await create(person(901), admin, null)).status, 403);
    assert.equal((await byEmail("person901@example.test")).length, 0);
  });
  test("employee without console:employees.manage → 403 missing-permission; nothing written", async () => {
    const before = await employeeCount();
    const res = await create(person(902), viewer);
    assert.equal(res.status, 403);
    assert.equal(res.body.error, "missing-permission");
    assert.equal(await employeeCount(), before);
  });
  test("other methods are not exposed (405)", async () => {
    for (const method of ["GET", "PUT", "PATCH", "DELETE"]) {
      const res = await fetch(`${BASE}/api/employees`, { method, headers: { Cookie: admin, Origin: ORIGIN } });
      assert.equal(res.status, 405, method);
    }
  });
});

describe("validation (server-side)", () => {
  test("missing required fields → 400 with a message per field", async () => {
    const res = await create({}, admin);
    assert.equal(res.status, 400);
    assert.deepEqual(Object.keys(res.body.fields).sort(), ["email", "firstName", "lastName", "roles"]);
    assert.equal((await create("not json", admin)).status, 400);
  });
  test("invalid email → 400", async () => {
    const res = await create(person(903, { email: "not-an-email" }), admin);
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.email);
  });
  test("non-existent role → 400 unknown-role; nothing written", async () => {
    const res = await create(person(904, { roles: ["no-such-role"] }), admin);
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "unknown-role");
    assert.equal((await byEmail("person904@example.test")).length, 0);
  });
});

describe("creation", () => {
  let first = "";
  test("admin creates an employee: server-generated EMP number, invited, unlinked, normalised, audited", async () => {
    const res = await create(
      {
        ...person(1, { email: "  Person1@Example.TEST ", secondName: " Lakshmi ", roles: ["shg-viewer", "console-admin"] }),
        address: { doorNo: "12-3", city: "Hyderabad", state: "Telangana", postalCode: "500001" },
        // Client attempts to choose identity/state: must be ignored.
        employeeNumber: "EMP-9999",
        status: "active",
        authUid: "attacker",
      },
      admin,
    );
    assert.equal(res.status, 201);
    first = res.body.employee.employeeNumber;
    assert.match(first, /^EMP-\d{4,}$/);
    assert.notEqual(first, "EMP-9999");
    assert.deepEqual(res.body.employee, {
      employeeNumber: first,
      displayName: "Test Lakshmi Person 1",
      email: "person1@example.test",
      roles: ["console-admin", "shg-viewer"],
      status: "invited",
    });

    const docs = await byEmail("person1@example.test");
    assert.equal(docs.length, 1);
    const d = docs[0];
    assert.match(d.id, /^emp_[A-Za-z0-9_-]{12}$/); // existing identity convention, unchanged
    assert.deepEqual(
      [d.get("status"), d.get("authUid"), d.get("employeeNumber"), d.get("displayName"), d.get("createdBy"), d.get("lastSignInAt")],
      ["invited", null, first, "Test Lakshmi Person 1", "emp_reader", null],
    );
    assert.deepEqual([d.get("firstName"), d.get("secondName"), d.get("lastName")], ["Test", "Lakshmi", "Person 1"]);
    assert.deepEqual(d.get("address"), { doorNo: "12-3", city: "Hyderabad", state: "Telangana", postalCode: "500001" });
    const audit = await workforce.collection("auditLog").where("target", "==", d.id).get();
    assert.equal(audit.size, 1);
    assert.deepEqual(
      [audit.docs[0].get("action"), audit.docs[0].get("actor"), audit.docs[0].get("employeeNumber")],
      ["employee-created", "emp_reader", first],
    );
  });

  test("duplicate email (any case / whitespace) → 409 with a field message; no second record", async () => {
    const res = await create(person(2, { email: " PERSON1@example.test" }), admin);
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "duplicate-email");
    assert.ok(res.body.fields.email);
    assert.equal((await byEmail("person1@example.test")).length, 1);
    // Existing seeded employees are protected too.
    assert.equal((await create(person(3, { email: "viewer@example.test" }), admin)).status, 409);
  });

  test("concurrent creations get unique, consecutive numbers", async () => {
    const results = await Promise.all([10, 11, 12, 13, 14, 15].map((n) => create(person(n), admin)));
    assert.ok(results.every((r) => r.status === 201), JSON.stringify(results.map((r) => r.status)));
    const numbers = results.map((r) => Number(r.body.employee.employeeNumber.slice(4))).sort((a, b) => a - b);
    assert.equal(new Set(numbers).size, 6);
    const start = Number(first.slice(4));
    assert.deepEqual(numbers, [1, 2, 3, 4, 5, 6].map((i) => start + i));
  });

  test("numbers are never reused, even after a record is removed", async () => {
    const all = (await workforce.collection("employees").get()).docs.map((d) => d.get("employeeNumber")).filter(Boolean);
    const highest = Math.max(...all.map((n: string) => Number(n.slice(4))));
    const last = (await workforce.collection("employees").where("employeeNumber", "==", `EMP-${String(highest).padStart(4, "0")}`).get()).docs[0];
    await last.ref.delete(); // emulator only: simulates a deleted record
    const res = await create(person(20), admin);
    assert.equal(res.status, 201);
    assert.equal(Number(res.body.employee.employeeNumber.slice(4)), highest + 1);
  });

  test("the new employee signs in with Google: existing admission links and activates them", async () => {
    const before = (await byEmail("person10@example.test"))[0];
    assert.deepEqual([before.get("status"), before.get("authUid")], ["invited", null]);
    const session = await signIn("person10@example.test");
    assert.equal(session.status, 200);
    const afterDoc = (await byEmail("person10@example.test"))[0];
    assert.equal(afterDoc.get("status"), "active");
    assert.ok(typeof afterDoc.get("authUid") === "string" && afterDoc.get("authUid").length > 0);
  });
});

describe("pages", () => {
  test("Employees: admins see 'Add employee' and the Employee ID column; no internal ids are rendered", async () => {
    const html = await page("/employees", admin);
    assert.ok(html.includes('data-action="add-employee"') && html.includes("Add employee"));
    assert.ok(html.includes("Employee ID") && html.includes("person1@example.test"));
    assert.ok(/EMP-\d{4}/.test(html));
    assert.ok(!html.includes("not available in the Console yet"));
    for (const internal of ["emp_reader", "emp_viewer", "authUid"]) assert.ok(!html.includes(internal), internal);
  });
  test("Employees: without console:employees.manage there is no button and no directory", async () => {
    const html = await page("/employees", viewer);
    assert.ok(!html.includes('data-action="add-employee"'));
    assert.ok(html.includes("You don&#x27;t have access") || html.includes("You don't have access"));
    assert.ok(!html.includes("person1@example.test"));
  });
  test("Add employee form renders for admins, with roles loaded from Workforce roles (a new role appears immediately)", async () => {
    await workforce.doc("roles/auditor-test").set({ product: "console", permissions: ["console:audit.read"], description: "Read the audit log" });
    const html = await page("/employees/new", admin);
    for (const text of ["Add employee", "Create an employee account for access to Ozey Console.", "First name", "Second name", "Last name", "Email", "Role", "PIN / Postal Code", "Create employee"]) {
      assert.ok(html.includes(text), text);
    }
    // The role options live in a popover, so verify the roles reach the page payload.
    for (const role of ["console-admin", "shg-viewer", "auditor-test"]) assert.ok(html.includes(role), role);
    await workforce.doc("roles/auditor-test").delete();
  });
  test("Add employee route: without the permission the form is not rendered", async () => {
    const html = await page("/employees/new", viewer);
    for (const field of ["Create employee", "First name", "PIN / Postal Code", "shg-viewer"]) assert.ok(!html.includes(field), field);
    assert.ok(html.includes("You don&#x27;t have access") || html.includes("You don't have access"));
  });
});

// ── Edit and delete ───────────────────────────────────────────────────────────

const shg = new Firestore({ projectId: "demo-ozey-shg" });

/** A fingerprint of every SHG emulator document: employee operations must never change it. */
async function shgFingerprint(): Promise<string> {
  const { createHash } = await import("node:crypto");
  const rows: string[] = [];
  async function walk(collection: FirebaseFirestore.CollectionReference) {
    for (const doc of (await collection.get()).docs) {
      rows.push(`${doc.ref.path}=${JSON.stringify(doc.data())}`);
      for (const sub of await doc.ref.listCollections()) await walk(sub);
    }
  }
  for (const root of await shg.listCollections()) await walk(root);
  rows.sort();
  return `${rows.length}:${createHash("sha256").update(rows.join("\n")).digest("hex")}`;
}

let shgBefore = "";
before(async () => {
  shgBefore = await shgFingerprint();
});
after(() => shg.terminate());

async function mutate(method: "PATCH" | "DELETE", employeeNumber: string, cookie?: string, body?: unknown, origin: string | null = ORIGIN) {
  const res = await fetch(`${BASE}/api/employees/${encodeURIComponent(employeeNumber)}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  return { status: res.status, body: text ? (JSON.parse(text) as any) : null };
}
const audits = async (action: string, target: string) =>
  (await workforce.collection("auditLog").where("action", "==", action).where("target", "==", target).get()).docs;

describe("edit and delete", () => {
  let target = ""; // EMP number of the employee being edited
  let targetId = "";

  before(async () => {
    const res = await create(person(300, { secondName: "Old", address: { city: "Pune" } }), admin);
    assert.equal(res.status, 201);
    target = res.body.employee.employeeNumber;
    targetId = (await byEmail("person300@example.test"))[0].id;
  });

  test("authorization: no session 401, cross-origin 403, without console:employees.manage 403 — for edit and delete", async () => {
    const edit = person(300, { firstName: "Hacked" });
    assert.equal((await mutate("PATCH", target, undefined, edit)).status, 401);
    assert.equal((await mutate("DELETE", target)).status, 401);
    assert.equal((await mutate("PATCH", target, admin, edit, "https://evil.example")).status, 403);
    assert.equal((await mutate("DELETE", target, admin, undefined, null)).status, 403);
    const denied = await mutate("PATCH", target, viewer, edit);
    assert.deepEqual([denied.status, denied.body.error], [403, "missing-permission"]);
    assert.deepEqual([(await mutate("DELETE", target, viewer)).status], [403]);
    const doc = (await byEmail("person300@example.test"))[0];
    assert.deepEqual([doc.get("firstName"), doc.get("status")], ["Test", "invited"]);
  });

  test("unknown or malformed employee numbers → 404 (document ids are never accepted)", async () => {
    assert.equal((await mutate("PATCH", "EMP-999999", admin, person(301))).status, 404);
    assert.equal((await mutate("DELETE", "EMP-999999", admin)).status, 404);
    assert.equal((await mutate("PATCH", targetId, admin, person(301))).status, 404);
    assert.equal((await mutate("DELETE", "../../roles/console-admin", admin)).status, 404);
  });

  test("edit: names, roles and address change; employee ID, document id, created date and creator never do; audited with what changed", async () => {
    const before = (await byEmail("person300@example.test"))[0];
    const resOk = await mutate("PATCH", target, admin, {
      firstName: "Renamed",
      secondName: "",
      lastName: "Person",
      email: "person300@example.test",
      roles: ["console-admin", "shg-viewer"],
      address: { city: "Hyderabad", state: "Telangana" },
      // Attempts to change immutable fields are ignored.
      employeeNumber: "EMP-0001",
      createdBy: "attacker",
      status: "active",
      authUid: "attacker",
    });
    assert.equal(resOk.status, 200);
    assert.deepEqual(resOk.body.changed.sort(), ["address", "displayName", "firstName", "lastName", "roles", "secondName"]);
    const after = (await byEmail("person300@example.test"))[0];
    assert.equal(after.id, before.id);
    assert.equal(after.get("employeeNumber"), target);
    assert.equal(after.get("createdAt").toMillis(), before.get("createdAt").toMillis());
    assert.equal(after.get("createdBy"), before.get("createdBy"));
    assert.deepEqual([after.get("status"), after.get("authUid")], ["invited", null]);
    assert.deepEqual(
      [after.get("displayName"), after.get("secondName"), after.get("roles"), after.get("address")],
      ["Renamed Person", null, ["console-admin", "shg-viewer"], { city: "Hyderabad", state: "Telangana" }],
    );
    assert.equal(after.get("updatedBy"), "emp_reader");
    // Permissions are never copied onto the employee: they stay on the roles.
    assert.equal(after.get("permissions"), undefined);
    const audit = await audits("employee-updated", targetId);
    assert.equal(audit.length, 1);
    assert.equal(audit[0].get("actor"), "emp_reader");
    assert.deepEqual(audit[0].get("changes").firstName, { from: "Test", to: "Renamed" });
    assert.deepEqual(audit[0].get("changes").roles.to, ["console-admin", "shg-viewer"]);
  });

  test("edit with no changes: 200, nothing written, no audit entry", async () => {
    const res = await mutate("PATCH", target, admin, {
      firstName: "Renamed", lastName: "Person", email: "person300@example.test", roles: ["shg-viewer", "console-admin"], address: { city: "Hyderabad", state: "Telangana" },
    });
    assert.deepEqual([res.status, res.body.changed], [200, []]);
    assert.equal((await audits("employee-updated", targetId)).length, 1);
  });

  test("edit validation: required fields, invalid email, duplicate email, unknown role id, role display name as id", async () => {
    const base = { firstName: "Renamed", lastName: "Person", email: "person300@example.test", roles: ["shg-viewer"] };
    const missing = await mutate("PATCH", target, admin, {});
    assert.deepEqual([missing.status, Object.keys(missing.body.fields).sort()], [400, ["email", "firstName", "lastName", "roles"]]);
    assert.equal((await mutate("PATCH", target, admin, { ...base, email: "nope" })).status, 400);
    const dup = await mutate("PATCH", target, admin, { ...base, email: " PERSON1@example.test" });
    assert.deepEqual([dup.status, dup.body.error], [409, "duplicate-email"]);
    const unknown = await mutate("PATCH", target, admin, { ...base, roles: ["no-such-role"] });
    assert.deepEqual([unknown.status, unknown.body.error], [400, "unknown-role"]);
    for (const name of ["Console Administrator", "SHG Viewer"]) {
      const res = await mutate("PATCH", target, admin, { ...base, roles: [name] });
      assert.equal(res.status, 400, name);
    }
    assert.deepEqual((await byEmail("person300@example.test"))[0].get("roles"), ["console-admin", "shg-viewer"]);
  });

  test("changing a signed-in employee's email unlinks the Google account, re-invites and ends their session", async () => {
    assert.equal((await create(person(310), admin)).status, 201);
    const theirSession = await signIn("person310@example.test");
    assert.equal(theirSession.status, 200);
    const number = (await byEmail("person310@example.test"))[0].get("employeeNumber");
    const res = await mutate("PATCH", number, admin, { ...person(310), email: "person310.new@example.test" });
    assert.deepEqual([res.status, res.body.reinvited], [200, true]);
    const doc = (await byEmail("person310.new@example.test"))[0];
    assert.deepEqual([doc.get("status"), doc.get("authUid"), doc.get("employeeNumber")], ["invited", null, number]);
    // The old session is revoked: it now redirects to sign-in.
    assert.equal((await fetch(`${BASE}/shg`, { headers: { Cookie: theirSession.cookie }, redirect: "manual" })).status, 307);
    // The old address can no longer sign in; the new one is admitted and activated.
    assert.equal((await signIn("person310@example.test")).status, 403);
    assert.equal((await signIn("person310.new@example.test")).status, 200);
    assert.equal((await byEmail("person310.new@example.test"))[0].get("status"), "active");
  });

  test("an administrator cannot lock themselves out: no self email change, no self removal of console:employees.manage, no self delete", async () => {
    assert.equal((await create(person(320, { roles: ["console-admin"] }), admin)).status, 201);
    const self = (await signIn("person320@example.test")).cookie;
    const number = (await byEmail("person320@example.test"))[0].get("employeeNumber");
    const email = await mutate("PATCH", number, self, { ...person(320, { roles: ["console-admin"] }), email: "elsewhere@example.test" });
    assert.deepEqual([email.status, email.body.error], [400, "self-lockout"]);
    const roles = await mutate("PATCH", number, self, person(320, { roles: ["shg-viewer"] }));
    assert.deepEqual([roles.status, roles.body.error], [400, "self-lockout"]);
    const del = await mutate("DELETE", number, self);
    assert.deepEqual([del.status, del.body.error], [400, "self-lockout"]);
    // Editing their own name is fine.
    assert.equal((await mutate("PATCH", number, self, person(320, { roles: ["console-admin"], firstName: "Self" }))).status, 200);
  });

  test("delete: offboards (record, ID and history kept), leaves the directory, ends sessions, refuses sign-in, never frees the ID", async () => {
    assert.equal((await create(person(330), admin)).status, 201);
    const theirSession = await signIn("person330@example.test");
    const doc = (await byEmail("person330@example.test"))[0];
    const number = doc.get("employeeNumber");
    const counterBefore = (await workforce.doc("counters/employees").get()).get("next");

    const res = await mutate("DELETE", number, admin);
    assert.deepEqual([res.status, res.body.employee.employeeNumber], [200, number]);
    const after = (await workforce.doc(`employees/${doc.id}`).get());
    assert.ok(after.exists, "record kept");
    assert.deepEqual([after.get("status"), after.get("employeeNumber"), after.get("email"), after.get("offboardedBy")], ["offboarded", number, "person330@example.test", "emp_reader"]);
    assert.equal((await workforce.doc("counters/employees").get()).get("next"), counterBefore, "counter untouched");
    assert.equal((await audits("employee-offboarded", doc.id)).length, 1);

    // Sessions end now; sign-in is refused; edit and delete are refused.
    assert.equal((await fetch(`${BASE}/shg`, { headers: { Cookie: theirSession.cookie }, redirect: "manual" })).status, 307);
    assert.equal((await signIn("person330@example.test")).status, 403);
    assert.deepEqual([(await mutate("PATCH", number, admin, person(330))).status, (await mutate("DELETE", number, admin)).status], [409, 409]);

    // Gone from the directory; the edit page explains instead of offering a form.
    const dir = await page("/employees", admin);
    assert.ok(!dir.includes("person330@example.test") && dir.includes("deleted (kept for audit)"));
    const edit = await page(`/employees/${number}/edit`, admin);
    assert.ok(edit.includes("This employee has been deleted") && !edit.includes("Save changes"));

    // The next employee gets a new number; the deleted one is never reissued.
    const next = await create(person(331), admin);
    assert.ok(Number(next.body.employee.employeeNumber.slice(4)) > Number(number.slice(4)));
    // Re-adding the same email is refused while the offboarded record exists (no duplicate identities).
    assert.equal((await create(person(330), admin)).status, 409);
  });

  test("pages: Actions menu for admins; edit page prefilled with a read-only employee ID; no access without the permission", async () => {
    const dir = await page("/employees", admin);
    assert.ok(dir.includes('data-action="employee-actions"') && dir.includes("Actions"));
    const edit = await page(`/employees/${target}/edit`, admin);
    for (const text of ["Edit employee", target, "cannot be changed", "Renamed", "person300@example.test", "Save changes"]) assert.ok(edit.includes(text), text);
    const denied = await page(`/employees/${target}/edit`, viewer);
    assert.ok(!denied.includes("Save changes") && !denied.includes("person300@example.test"));
    assert.equal((await fetch(`${BASE}/employees/not-a-number/edit`, { headers: { Cookie: admin } })).status, 404);
  });

  test("employee operations never touch SHG data", async () => {
    assert.equal(await shgFingerprint(), shgBefore);
  });
});
