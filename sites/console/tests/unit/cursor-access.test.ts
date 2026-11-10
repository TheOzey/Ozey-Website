import assert from "node:assert/strict";
import { test } from "node:test";
import { decideShgRead } from "../../src/lib/server/shg/core/access.ts";
import { decodeCursor, encodeCursor, InvalidCursorError } from "../../src/lib/server/shg/core/cursor.ts";

test("authorization: no session → 401", () => {
  assert.deepEqual(decideShgRead(null), { allowed: false, status: 401, error: "unauthenticated" });
});
test("authorization: suspended / offboarded / unlinked employee → 403", () => {
  for (const reason of ["suspended", "offboarded", "not-an-employee", "invited"]) {
    assert.deepEqual(decideShgRead({ state: "inactive", reason }), { allowed: false, status: 403, error: "inactive-employee" });
  }
});
test("authorization: active employee without shg:read → 403 (console-admin alone is not enough)", () => {
  const d = decideShgRead({ state: "active", employeeId: "e", permissions: ["console:employees.manage", "console:audit.read"] });
  assert.deepEqual(d, { allowed: false, status: 403, error: "missing-permission" });
});
test("authorization: look-alike permissions are not shg:read", () => {
  for (const p of ["shg:*", "*", "shg:write", "shg:readx", "SHG:READ"]) {
    assert.equal(decideShgRead({ state: "active", employeeId: "e", permissions: [p] }).allowed, false, p);
  }
});
test("authorization: active employee with shg:read → allowed", () => {
  assert.deepEqual(decideShgRead({ state: "active", employeeId: "e1", permissions: ["shg:read"] }), { allowed: true, employeeId: "e1" });
});

const prefixes = (key: string) => ({ "saving|g1": "groups/g1/savings/", "members|g2": "groups/g2/members/" })[key] ?? null;
test("cursor: round trip", () => {
  const raw = encodeCursor({ "saving|g1": "groups/g1/savings/s9", "members|g2": "done" });
  assert.deepEqual(decodeCursor(raw, prefixes), { "saving|g1": "groups/g1/savings/s9", "members|g2": "done" });
});
test("cursor: anchors outside their own collection are rejected (no arbitrary document reads)", () => {
  const forged: Record<string, string>[] = [
    { "saving|g1": "users/someone" },
    { "saving|g1": "groups/g2/savings/s1" },
    { "saving|g1": "groups/g1/savings/a/b/c" },
    { "saving|g1": "groups/g1/savings/" },
    { "unknown|g1": "groups/g1/savings/s1" },
  ];
  for (const state of forged) {
    assert.throws(() => decodeCursor(encodeCursor(state), prefixes), InvalidCursorError, JSON.stringify(state));
  }
  assert.throws(() => decodeCursor("not-base64-json", prefixes), InvalidCursorError);
});
