// SHG read API integration tests (EMULATOR ONLY). Run via tests/integration/run.sh,
// which starts the Auth + Firestore emulators, seeds seed-emulator.ts, and starts:
//   CONSOLE_URL          console with SHG_DATA_SOURCE=emulator
//   CREDENTIAL_FAIL_URL  console with the default impersonation source and no
//                        caller identity (emulator mode) → SHG credential failure
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { Firestore } from "@google-cloud/firestore";

const BASE = `${process.env.CONSOLE_URL ?? "http://localhost:3100"}/dashboard`;
const FAIL_BASE = process.env.CREDENTIAL_FAIL_URL ? `${process.env.CREDENTIAL_FAIL_URL}/dashboard` : null;
const ORIGIN = new URL(BASE).origin;
const workforce = new Firestore({ projectId: "demo-ozey-workforce" });
// Raw emulator reads, independent of the console code, for time-relative expectations.
const shgRaw = new Firestore({ projectId: "demo-ozey-shg" });
const near = (a: number, b: number) => Math.abs(a - b) < 0.005;
// Hand-worked from the fixtures (seed-emulator.ts):
//   l_flat  10000 flat 2% 6 mo, repaid 2000 via records → principal out 10000 − 2000 × 10000/11200
//   l_rb    12000 reducing 2% 12 mo, nothing repaid      → 12000
//   l_repaid 5000 flat, repaid 5500 = totalDue            → 0
//   l_flex   8000 flexible, 500 repaid                    → not derivable (excluded, reported)
const GRP_A_RECORDED_OUT = 10000 - (2000 * 10000) / 11200 + 12000;
const GRP_A_OPENING_OUT = 9000 - 1500; // snapshot − loan-kind collections (interest or2 does not count)

async function googleSignIn(email: string): Promise<string> {
  const idp = JSON.stringify({ sub: `g-${email}`, email, email_verified: true });
  const res = await fetch("http://127.0.0.1:9299/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postBody: `id_token=${encodeURIComponent(idp)}&providerId=google.com`, requestUri: "http://localhost", returnSecureToken: true }),
  });
  return ((await res.json()) as { idToken: string }).idToken;
}

async function sessionCookie(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: await googleSignIn(email) }),
  });
  assert.equal(res.status, 200, `session for ${email}`);
  return res.headers.get("set-cookie")!.split(";")[0];
}

async function api(path: string, cookie?: string, init: RequestInit = {}, base = BASE) {
  const res = await fetch(`${base}/api/shg/${path}`, { ...init, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(init.headers ?? {}) } });
  const text = await res.text();
  return { status: res.status, text, body: text ? (JSON.parse(text) as any) : null };
}

const ROUTES = [
  "overview", "groups", "groups/search?q=A", "groups/names?ids=grp_a", "groups/grp_a", "groups/grp_a/roster", "groups/grp_a/loans",
  "groups/grp_a/meetings", "members", "members/grp_a/m1", "transactions", "loans", "meetings", "reports?group=grp_a&year=2026",
];

let reader = "";
let noShg = "";

before(async () => {
  reader = await sessionCookie("reader@example.test");
  noShg = await sessionCookie("noshg@example.test");
});
after(async () => {
  await workforce.doc("employees/emp_reader").update({ status: "active" });
  await workforce.terminate();
  await shgRaw.terminate();
});

describe("authorization (server-side, every SHG route)", () => {
  test("no session → 401", async () => {
    for (const r of ROUTES) assert.equal((await api(r)).status, 401, r);
  });
  test("forged session cookie → 401", async () => {
    assert.equal((await api("overview", "ozey_console_session=forged.value")).status, 401);
  });
  test("employee without shg:read (console-admin only) → 403", async () => {
    for (const r of ROUTES) {
      const res = await api(r, noShg);
      assert.equal(res.status, 403, r);
      assert.equal(res.body.error, "missing-permission");
    }
  });
  test("employee with shg:read → 200", async () => {
    for (const r of ROUTES) assert.equal((await api(r, reader)).status, 200, r);
  });
});

describe("data access (origin/main schema)", () => {
  test("overview: aggregates every group from the records (opening + recorded), last-30-day figures by their own date fields", async () => {
    const { body } = await api("overview", reader);
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const groups = (await shgRaw.collection("groups").get()).docs;
    const savings = (await shgRaw.collectionGroup("savings").get()).docs;
    assert.equal(body.groups, 3);
    assert.equal(body.groupsAddedLast30Days, groups.filter((g) => g.get("createdAt").toMillis() >= since).length);
    assert.deepEqual(body.members, { active: 6, activeAddedLast30Days: 0 }); // fixtures joined in 2025
    assert.deepEqual([body.savings.opening, body.savings.recorded, body.savings.total], [42000, 4000 + 7200, 42000 + 4000 + 7200]);
    assert.equal(body.savings.recordedLast30Days, savings.filter((d) => d.get("date").toMillis() >= since).reduce((s, d) => s + d.get("amount"), 0));
    assert.deepEqual([body.loans.recordedPrincipal, body.loans.openingGiven, body.loans.totalRecorded], [35000, 30000, 65000]);
    assert.ok(near(body.loans.outstandingPrincipal, GRP_A_RECORDED_OUT + GRP_A_OPENING_OUT));
    assert.deepEqual([body.loans.unknownFlexibleLoans, body.loans.unknownFlexiblePrincipal], [1, 8000]);
    assert.deepEqual(body.topGroupsBySavings.map((g: any) => [g.id, g.savings]), [["grp_a", 46000], ["grp_b", 7200], ["grp_c", 0]]);
    assert.ok(!("recentTransactions" in body) && !("recentMeetings" in body));
  });
  test("groups: per-row financials match the overview definitions; detail without bank details or secrets", async () => {
    const { body } = await api("groups", reader);
    assert.deepEqual(body.items.map((g: any) => g.name), ["Asha SHG", "Deepam SHG", "Jyothi SHG"]);
    const a = body.items[0].financials;
    assert.deepEqual([a.members.active, a.savings.opening, a.savings.recorded, a.savings.total], [3, 42000, 4000, 46000]);
    assert.deepEqual([a.loans.totalRecorded, a.loans.openingOutstanding], [65000, 7500]);
    assert.ok(near(a.loans.outstandingPrincipal, GRP_A_RECORDED_OUT + GRP_A_OPENING_OUT));
    assert.deepEqual([body.items[2].financials.savings.total, body.items[2].financials.loans.totalRecorded], [0, 0]); // empty group
    const detail = await api("groups/grp_a", reader);
    assert.equal(detail.body.openingBalance.totalSavings, 42000);
    assert.equal(detail.body.financials.savings.total, 46000);
    for (const secret of ["accountNumber", "ifscCode", "accountHolder", "inviteCode", "adminUid", "000111", "SECRET1"]) {
      assert.ok(!detail.text.includes(secret), secret);
    }
  });
  test("members: across groups, sorted; roster includes members who left; no ID numbers/addresses", async () => {
    const all = await api("members", reader);
    assert.equal(all.body.items.length, 7);
    const names = all.body.items.map((m: any) => m.name);
    assert.deepEqual(names, [...names].sort());
    const roster = await api("groups/grp_a/roster", reader);
    assert.equal(roster.body.length, 4);
    assert.equal(roster.body.find((m: any) => m.id === "m4").status, "left");
    for (const pii of ["idNumber", "AADHAAR", "address", "Street"]) assert.ok(!all.text.includes(pii) && !roster.text.includes(pii), pii);
  });
  test("loans: recorded + one opening row per member, no double counting; principal outstanding; flexible explicit", async () => {
    const { body } = await api("groups/grp_a/loans", reader);
    const byId = Object.fromEntries(body.loans.map((l: any) => [l.id, l]));
    assert.deepEqual(Object.keys(byId).sort(), ["l_flat", "l_flex", "l_rb", "l_repaid", "opening:m1", "opening:m4"]);
    assert.deepEqual(
      [byId.l_flat.interestModel, byId.l_flat.tenureMonths, byId.l_flat.totalInterest, byId.l_flat.totalDue, byId.l_flat.outstanding],
      ["flat", 6, 1200, 11200, 9200],
    );
    assert.ok(near(byId.l_flat.principalOutstanding, 10000 - (2000 * 10000) / 11200));
    assert.deepEqual([byId.l_rb.interestModel, byId.l_rb.totalInterest, byId.l_rb.outstanding, byId.l_rb.principalOutstanding], ["reducingBalance", 1560, 13560, 12000]);
    assert.deepEqual(
      [byId.l_flex.repaymentMode, byId.l_flex.interestKnown, byId.l_flex.totalInterest, byId.l_flex.totalDue, byId.l_flex.outstanding, byId.l_flex.principalOutstanding],
      ["flexible", false, null, null, null, null],
    );
    assert.deepEqual([byId.l_repaid.outstanding, byId.l_repaid.principalOutstanding], [0, 0]);
    // Opening loans: from openingBalance maps (member ids), never duplicated as recorded loans.
    assert.deepEqual(
      [byId["opening:m4"].source, byId["opening:m4"].principal, byId["opening:m4"].outstandingAtOpening, byId["opening:m4"].amountRepaid, byId["opening:m4"].principalOutstanding, byId["opening:m4"].memberName],
      ["opening", 20000, 9000, 1500, 7500, "Vijaya L"],
    );
    assert.deepEqual([byId["opening:m1"].principal, byId["opening:m1"].principalOutstanding, byId["opening:m1"].status], [10000, 0, "repaid"]);
    assert.deepEqual([body.totals.totalRecorded, body.totals.recordedCount], [65000, 4]);
    const overdue = await api("loans?group=grp_a&status=overdue", reader);
    assert.deepEqual(overdue.body.items.map((l: any) => l.id), ["l_rb"]);
  });
  test("transactions: payment records only (no disbursements), all four collections, exact two-page pagination", async () => {
    const first = await api("transactions", reader);
    assert.equal(first.body.items.length, 25);
    assert.ok(first.body.next);
    const second = await api(`transactions?cursor=${encodeURIComponent(first.body.next)}`, reader);
    assert.equal(second.body.next, null);
    const all = [...first.body.items, ...second.body.items];
    const raw = await Promise.all(["savings", "repayments", "openingRepayments", "monthlyCharges"].map((c) => shgRaw.collectionGroup(c).get()));
    assert.equal(all.length, raw.reduce((n, r) => n + r.size, 0));
    assert.equal(all.length, 41);
    assert.equal(new Set(all.map((t: any) => t.key)).size, 41);
    const times = all.map((t: any) => Date.parse(t.date));
    assert.ok(times.every((t, i) => i === 0 || t <= times[i - 1]), "newest first");
    assert.deepEqual(
      Object.fromEntries(["saving", "repayment", "disbursement", "opening-repayment", "monthly-charge"].map((k) => [k, all.filter((t: any) => t.kind === k).length])),
      { saving: 34, repayment: 4, disbursement: 0, "opening-repayment": 2, "monthly-charge": 1 },
    );
    assert.ok(all.some((t: any) => t.kind === "saving" && t.isReversal && t.amount === -500));
    // Opening repayments carry no member name: resolved from the member document.
    assert.ok(all.filter((t: any) => t.kind === "opening-repayment").every((t: any) => t.memberName === "Vijaya L"));
    assert.deepEqual(all.filter((t: any) => t.kind === "opening-repayment").map((t: any) => t.openingKind).sort(), ["interest", "loan"]);
    assert.equal((await api("transactions?type=disbursement", reader)).body.items.filter((t: any) => t.kind === "disbursement").length, 0);
  });
  test("member detail: opening + recorded position (MemberAccountSummary) and complete history by member id", async () => {
    const m1 = (await api("members/grp_a/m1", reader)).body;
    assert.deepEqual(m1.account.savings, { opening: 14000, recorded: 1500, recordedFromEntries: 1500, entries: 3, total: 15500 });
    assert.deepEqual([m1.account.loans.openingTaken, m1.account.loans.recordedPrincipal, m1.account.loans.totalTaken], [10000, 15000, 25000]);
    assert.ok(near(m1.account.loans.outstandingPrincipal, 10000 - (2000 * 10000) / 11200));
    assert.deepEqual(m1.account.interest, { openingPaidBeforeApp: 1000, openingCollected: 0, total: 1000 });
    assert.deepEqual(m1.account.meetings, { attended: 2, recorded: 2 });
    // 3 savings + 3 repayments + 2 loans given + 3 opening entries (savings, loans taken, interest paid).
    assert.equal(m1.history.items.length, 11);
    assert.ok(m1.history.items.every((t: any) => t.memberId === "m1"));
    assert.deepEqual(
      m1.history.items.filter((t: any) => t.kind === "opening-balance").map((t: any) => [t.openingKind, t.amount]).sort(),
      [["interestPaid", 1000], ["loanTaken", 10000], ["savings", 14000]],
    );
    const m4 = (await api("members/grp_a/m4", reader)).body;
    assert.deepEqual(
      [m4.account.savings.total, m4.account.loans.openingTaken, m4.account.loans.openingOutstandingAtStart, m4.account.loans.openingCollected, m4.account.loans.openingOutstanding],
      [1500, 20000, 9000, 1500, 7500],
    );
    assert.deepEqual(m4.account.interest, { openingPaidBeforeApp: 2100, openingCollected: 150, total: 2250 });
    const m3 = (await api("members/grp_a/m3", reader)).body;
    assert.equal(m3.account.loans.unknownFlexibleLoans, 1);
    assert.deepEqual(m3.loans.map((l: any) => l.principalOutstanding), [null]);
    const empty = (await api("members/grp_c/c1", reader)).body;
    assert.deepEqual([empty.account.savings.opening, empty.account.loans.totalTaken, empty.account.hasOpening, empty.loans.length], [0, 0, false, 0]);
  });
  test("transactions: type, member and IST date-range filters", async () => {
    const charges = await api("transactions?type=monthly-charge", reader);
    assert.deepEqual(charges.body.items.map((t: any) => [t.chargeKind, t.appliesToPeriod, t.amount]), [["lateFee", "2026-08", 20]]);
    const member = await api("transactions?group=grp_a&member=m1", reader);
    assert.deepEqual(member.body.items.map((t: any) => t.kind).sort(), ["repayment", "repayment", "repayment", "saving", "saving", "saving"]);
    const sep = await api("transactions?group=grp_a&from=2026-09-01&to=2026-09-30", reader);
    assert.ok(sep.body.items.length > 0);
    assert.ok(sep.body.items.every((t: any) => t.date >= "2026-08-31T18:30:00.000Z" && t.date < "2026-09-30T18:30:00.000Z"));
  });
  test("meetings: attendance; empty collections are a 200 empty state, not an error", async () => {
    const all = await api("meetings", reader);
    assert.deepEqual(all.body.items.map((m: any) => [m.period, m.attendeeCount, m.attributedRecords]), [["2026-09", 3, true], ["2026-08", 3, true]]);
    for (const r of ["meetings?group=grp_c", "groups/grp_c/meetings", "groups/grp_c/loans", "transactions?group=grp_c"]) {
      const res = await api(r, reader);
      assert.equal(res.status, 200, r);
    }
    assert.deepEqual((await api("meetings?group=grp_c", reader)).body, { items: [], next: null });
  });
  test("reports: computed monthly sums, app closure snapshot attached, rule version per month", async () => {
    const { body } = await api("reports?group=grp_a&year=2026", reader);
    const m = Object.fromEntries(body.months.map((x: any) => [x.period, x]));
    assert.deepEqual([m["2026-09"].savings, m["2026-09"].loanRepayments, m["2026-09"].lateFeesCollected, m["2026-09"].otherIncome, m["2026-09"].expenses], [1000, 1000, 20, 100, 40]);
    assert.equal(m["2026-08"].closure.closingBalance, 41000);
    assert.equal(m["2026-08"].closure.status, "closed");
    assert.equal(m["2026-09"].closure, null);
    assert.equal(m["2026-08"].rules.monthlySavings, 500);
    assert.equal(m["2026-09"].rules.monthlySavings, 600);
    assert.deepEqual([m["2026-01"].loansDisbursed, m["2026-02"].loansDisbursed, m["2026-03"].loansDisbursed], [12000, 8000, 10000]);
    assert.equal(m["2026-05"].openingRepayments, 1500);
    assert.equal(body.totals.savings, 4000);
    assert.ok(!JSON.stringify(body).includes("updatedByUid") && !JSON.stringify(body).includes("admin-uid"));
    const empty = await api("reports?group=grp_c&year=2026", reader);
    assert.ok(empty.body.months.every((x: any) => x.savings === 0 && x.closure === null));
  });
});

describe("security", () => {
  test("no write operation is exposed: POST/PUT/PATCH/DELETE → 405 on every SHG route", async () => {
    for (const r of ROUTES) {
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        const res = await fetch(`${BASE}/api/shg/${r}`, { method, headers: { Cookie: reader, Origin: ORIGIN, "Content-Type": "application/json" }, body: "{}" });
        assert.equal(res.status, 405, `${method} ${r}`);
      }
    }
  });
  test("forged or invalid cursors → 400 (never an arbitrary document read)", async () => {
    const forge = (s: Record<string, string>) => Buffer.from(JSON.stringify({ v: 1, s })).toString("base64url");
    for (const c of ["garbage", forge({ "saving|grp_a": "users/someone" }), forge({ "saving|grp_a": "groups/grp_b/savings/x" }), forge({ "nope|grp_a": "groups/grp_a/savings/x" })]) {
      assert.equal((await api(`transactions?cursor=${encodeURIComponent(c)}`, reader)).status, 400, c);
    }
  });
  test("unknown or path-like ids → 404", async () => {
    for (const r of ["groups/does-not-exist", "groups/__x__", `groups/${encodeURIComponent("grp_a/members/m1")}`, "members/grp_a/nope", "reports?group=..%2Fusers&year=2026"]) {
      assert.equal((await api(r, reader)).status, 404, r);
    }
  });
  test("SHG credential failure → 503, never a fallback", { skip: !FAIL_BASE }, async () => {
    for (const r of ["overview", "groups", "transactions"]) {
      const res = await api(r, reader, {}, FAIL_BASE!);
      assert.equal(res.status, 503, r);
      assert.equal(res.body.error, "shg-unavailable");
    }
  });
  test("suspended employee → 403 (live session cut off within the 60 s cache)", async () => {
    await workforce.doc("employees/emp_reader").update({ status: "suspended" });
    const deadline = Date.now() + 90_000;
    let status = 0;
    while (Date.now() < deadline) {
      status = (await api("overview", reader)).status;
      if (status === 403) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
    assert.equal(status, 403);
  });
});
