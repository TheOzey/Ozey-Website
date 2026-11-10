import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEmployeeNumber, planEmployeeNumbers, planRoleDisplayNames, roleLabel } from "../../src/lib/employees/migrations.ts";

const at = (iso: string) => new Date(iso);

test("employee numbers: only employees without one, oldest first, continuing from the counter", () => {
  const plan = planEmployeeNumbers(
    [
      { id: "emp_b", employeeNumber: undefined, createdAt: at("2026-09-20T00:00:00Z") },
      { id: "emp_a", employeeNumber: null, createdAt: at("2026-09-15T00:00:00Z") },
      { id: "emp_c", employeeNumber: "EMP-0001", createdAt: at("2026-10-01T00:00:00Z") },
      { id: "emp_d", employeeNumber: "", createdAt: null },
    ],
    2,
  );
  assert.deepEqual(plan.assignments, [
    { id: "emp_d", employeeNumber: "EMP-0002" }, // unknown createdAt sorts first, deterministically
    { id: "emp_a", employeeNumber: "EMP-0003" },
    { id: "emp_b", employeeNumber: "EMP-0004" },
  ]);
  assert.equal(plan.nextCounter, 5);
  assert.deepEqual(plan.malformed, []);
});

test("employee numbers: never reissue a number even if the counter is behind (or absent)", () => {
  const plan = planEmployeeNumbers(
    [
      { id: "emp_x", employeeNumber: "EMP-0007", createdAt: null },
      { id: "emp_y", employeeNumber: undefined, createdAt: null },
    ],
    3,
  );
  assert.deepEqual(plan.assignments, [{ id: "emp_y", employeeNumber: "EMP-0008" }]);
  assert.equal(plan.nextCounter, 9);
  assert.deepEqual(planEmployeeNumbers([{ id: "e", employeeNumber: undefined, createdAt: null }], undefined).assignments, [{ id: "e", employeeNumber: "EMP-0001" }]);
  assert.equal(planEmployeeNumbers([{ id: "e", employeeNumber: undefined, createdAt: null }], "junk").nextCounter, 2);
});

test("employee numbers: rerunning on migrated data is a no-op (idempotent), counter untouched", () => {
  const first = planEmployeeNumbers(
    [
      { id: "emp_a", employeeNumber: undefined, createdAt: at("2026-09-15T00:00:00Z") },
      { id: "emp_b", employeeNumber: undefined, createdAt: at("2026-09-16T00:00:00Z") },
    ],
    undefined,
  );
  const migrated = first.assignments.map((a) => ({ id: a.id, employeeNumber: a.employeeNumber, createdAt: null }));
  const second = planEmployeeNumbers(migrated, first.nextCounter);
  assert.deepEqual(second.assignments, []);
  assert.equal(second.nextCounter, first.nextCounter);
  assert.equal(new Set(migrated.map((m) => m.employeeNumber)).size, migrated.length);
});

test("employee numbers: a malformed existing value is reported and never overwritten", () => {
  const plan = planEmployeeNumbers([{ id: "emp_m", employeeNumber: "E-12", createdAt: null }], 1);
  assert.deepEqual(plan.assignments, []);
  assert.deepEqual(plan.malformed, ["emp_m"]);
  assert.equal(parseEmployeeNumber("EMP-0042"), 42);
  assert.equal(parseEmployeeNumber("EMP-12345"), 12345);
  for (const bad of ["EMP-42", "emp-0042", "EMP-00x1", 42, null]) assert.equal(parseEmployeeNumber(bad), null, String(bad));
});

test("role display names: set only for known roles with none; existing names are never overwritten", () => {
  const plan = planRoleDisplayNames([
    { id: "console-admin", displayName: undefined },
    { id: "shg-viewer", displayName: "  " },
    { id: "custom-role", displayName: undefined },
    { id: "console-admin-2", displayName: "Already Named" },
  ]);
  assert.deepEqual(plan.set, [
    { id: "console-admin", displayName: "Console Administrator" },
    { id: "shg-viewer", displayName: "SHG Viewer" },
  ]);
  assert.deepEqual(plan.unnamed, ["custom-role"]);
  assert.deepEqual(planRoleDisplayNames([{ id: "console-admin", displayName: "Admins" }]).set, []); // rerun / renamed: untouched
});

test("role label: display name when set, otherwise the role id", () => {
  assert.equal(roleLabel({ id: "console-admin", displayName: "Console Administrator" }), "Console Administrator");
  assert.equal(roleLabel({ id: "console-admin", displayName: null }), "console-admin");
  assert.equal(roleLabel({ id: "x", displayName: "  " }), "x");
});
