// Partner-management integration tests (EMULATOR ONLY). Run via tests/integration/run.sh.
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

async function mutate(method: string, path: string, cookie: string, body?: unknown, origin: string | null = ORIGIN) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...(origin ? { Origin: origin } : {}),
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? (JSON.parse(text) as any) : null };
}

const create = (body: unknown, cookie: string, origin?: string | null) => mutate("POST", "/api/partners", cookie, body, origin);
const createEmployee = (body: unknown, cookie: string) => mutate("POST", "/api/employees", cookie, body);

const partner = (n: number, over: Record<string, unknown> = {}) => ({
  firstName: "Field",
  lastName: `Partner ${n}`,
  mobile: `9${String(800000000 + n).slice(-9)}`,
  partnerType: "digital_sakhi",
  ...over,
});

let admin = "";
let viewer = "";

before(async () => {
  admin = (await signIn("reader@example.test")).cookie;
  viewer = (await signIn("viewer@example.test")).cookie;
  assert.ok(admin && viewer);
});
after(() => workforce.terminate());

describe("partner authorization", () => {
  test("no session → 401", async () => {
    const res = await mutate("POST", "/api/partners", "", partner(700));
    assert.equal(res.status, 401);
  });

  test("employee without partners.manage → 403; nothing written", async () => {
    const before = (await workforce.collection("partners").count().get()).data().count;
    const res = await create(partner(701), viewer);
    assert.equal(res.status, 403);
    assert.equal(res.body?.error, "missing-permission");
    assert.equal((await workforce.collection("partners").count().get()).data().count, before);
  });

  test("cross-origin → 403", async () => {
    assert.equal((await create(partner(702), admin, "https://evil.example")).status, 403);
  });
});

describe("partner creation independent of employees", () => {
  test("create does not require roles and does not create an employee", async () => {
    const employeesBefore = (await workforce.collection("employees").count().get()).data().count;
    const res = await create(partner(710, { email: "sakhi710@example.test" }), admin);
    assert.equal(res.status, 201);
    assert.match(res.body.partner.partnerNumber, /^OZEY-DS-\d+$/);
    assert.equal(res.body.partner.status, "active");
    assert.ok(!("roles" in res.body.partner));

    const docs = await workforce.collection("partners").where("partnerNumber", "==", res.body.partner.partnerNumber).get();
    assert.equal(docs.size, 1);
    assert.equal(docs.docs[0].get("mobile"), partner(710).mobile);
    assert.ok(!docs.docs[0].get("roles"));

    assert.equal((await workforce.collection("employees").count().get()).data().count, employeesBefore);
    assert.equal((await workforce.collection("employees").where("email", "==", "sakhi710@example.test").get()).size, 0);
  });

  test("Digital Sakhi and Digital Sarathi counters are independent", async () => {
    const sakhi = await create(partner(720, { partnerType: "digital_sakhi", mobile: "9800000720" }), admin);
    const sarathi = await create(partner(721, { partnerType: "digital_sarathi", mobile: "9800000721" }), admin);
    const sakhi2 = await create(partner(722, { partnerType: "digital_sakhi", mobile: "9800000722" }), admin);
    assert.equal(sakhi.status, 201);
    assert.equal(sarathi.status, 201);
    assert.equal(sakhi2.status, 201);
    assert.match(sakhi.body.partner.partnerNumber, /^OZEY-DS-/);
    assert.match(sarathi.body.partner.partnerNumber, /^OZEY-DST-/);
    assert.notEqual(sakhi.body.partner.partnerNumber, sarathi.body.partner.partnerNumber);

    const sakhiSeq = Number(sakhi.body.partner.partnerNumber.slice("OZEY-DS-".length));
    const sakhi2Seq = Number(sakhi2.body.partner.partnerNumber.slice("OZEY-DS-".length));
    assert.equal(sakhi2Seq, sakhiSeq + 1);
  });

  test("concurrent creates yield unique Partner IDs", async () => {
    const results = await Promise.all(
      [730, 731, 732, 733].map((n) => create(partner(n, { mobile: `9800000${n}` }), admin)),
    );
    for (const r of results) assert.equal(r.status, 201);
    const codes = results.map((r) => r.body.partner.partnerNumber);
    assert.equal(new Set(codes).size, codes.length);
  });

  test("employee create still requires roles and does not mint partner numbers", async () => {
    const res = await createEmployee(
      { firstName: "Internal", lastName: "Staff", email: "staff740@example.test", roles: ["shg-viewer"] },
      admin,
    );
    assert.equal(res.status, 201);
    assert.match(res.body.employee.employeeNumber, /^EMP-/);
    assert.ok(!("partnerNumber" in res.body.employee));
    assert.ok(!("partnerCode" in res.body.employee));
    assert.ok(!("designation" in res.body.employee));
  });
});

describe("partner lifecycle", () => {
  test("category change preserves Partner ID and is audited", async () => {
    const created = await create(partner(750, { partnerType: "digital_sakhi", mobile: "9800000750" }), admin);
    assert.equal(created.status, 201);
    const number = created.body.partner.partnerNumber as string;
    const patched = await mutate("PATCH", `/api/partners/${encodeURIComponent(number)}`, admin, {
      ...partner(750, { partnerType: "digital_sarathi", mobile: "9800000750", firstName: "Renamed" }),
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.partner.partnerNumber, number);
    assert.equal(patched.body.partner.partnerType, "digital_sarathi");

    const audits = await workforce.collection("partnerAuditLog").where("partnerNumber", "==", number).get();
    assert.ok(audits.docs.some((d) => d.get("action") === "partner-type-changed-id-preserved"));
  });

  test("termination retires ID; ID is never reused", async () => {
    const created = await create(partner(760, { partnerType: "digital_sarathi", mobile: "9800000760" }), admin);
    assert.equal(created.status, 201);
    const number = created.body.partner.partnerNumber as string;

    const ended = await mutate("POST", `/api/partners/${encodeURIComponent(number)}`, admin, { status: "terminated" });
    assert.equal(ended.status, 200);
    assert.equal(ended.body.partner.status, "terminated");

    const reg = await workforce.doc(`partnerCodeRegistry/${number}`).get();
    assert.equal(reg.get("status"), "retired");

    // Force counter behind registry to prove reuse is blocked.
    await workforce.doc("counters/partnerCodes").set({ nextSarathi: Number(number.slice("OZEY-DST-".length)) }, { merge: true });
    const again = await create(partner(761, { partnerType: "digital_sarathi", mobile: "9800000761" }), admin);
    if (again.status === 201) {
      assert.notEqual(again.body.partner.partnerNumber, number);
    } else {
      assert.equal(again.status, 409);
    }
  });

  test("deactivation preserves historical partner record", async () => {
    const created = await create(partner(770, { mobile: "9800000770" }), admin);
    const number = created.body.partner.partnerNumber as string;
    const inactive = await mutate("POST", `/api/partners/${encodeURIComponent(number)}`, admin, { status: "inactive" });
    assert.equal(inactive.status, 200);
    assert.equal(inactive.body.partner.status, "inactive");

    const doc = (await workforce.collection("partners").where("partnerNumber", "==", number).get()).docs[0];
    assert.ok(doc);
    assert.equal(doc.get("status"), "inactive");
    assert.equal(doc.get("partnerNumber"), number);
    assert.ok(doc.get("displayName"));
  });
});

describe("partner dashboard honesty and SHG boundary", () => {
  test("profile sections render unavailable states without fake SHG writes", async () => {
    const created = await create(partner(780, { mobile: "9800000780" }), admin);
    const number = created.body.partner.partnerNumber as string;
    const html = await (await fetch(`${BASE}/partners/${encodeURIComponent(number)}/performance`, { headers: { Cookie: admin } })).text();
    assert.match(html, /Unavailable|Awaiting SHG attribution|Billing not connected/i);

    // No SHG write API exists under partners.
    const shgWrite = await fetch(`${BASE}/api/partners/${encodeURIComponent(number)}/shgs`, {
      method: "POST",
      headers: { Cookie: admin, Origin: ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: "fake" }),
    });
    assert.ok(shgWrite.status === 404 || shgWrite.status === 405);
  });
});
