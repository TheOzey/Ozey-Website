import assert from "node:assert/strict";
import { test } from "node:test";
import { formatEmployeeNumber, validateNewEmployee } from "../../src/lib/employees/new-employee.ts";

const valid = { firstName: "Asha", lastName: "Rao", email: "asha@example.com", roles: ["console-admin"] };

test("required fields: first name, last name, email and at least one role", () => {
  const r = validateNewEmployee({});
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(!r.ok ? r.errors : {}).sort(), ["email", "firstName", "lastName", "roles"]);
  assert.equal(validateNewEmployee(null).ok, false);
  assert.equal(validateNewEmployee({ ...valid, firstName: "   " }).ok, false);
});

test("email is trimmed and lowercased; invalid formats are rejected", () => {
  const r = validateNewEmployee({ ...valid, email: "  Asha.Rao@Example.COM " });
  assert.ok(r.ok && r.value.email === "asha.rao@example.com");
  for (const bad of ["asha", "asha@", "@example.com", "asha@example", "a b@example.com", `${"a".repeat(250)}@x.co`]) {
    const res = validateNewEmployee({ ...valid, email: bad });
    assert.ok(!res.ok && res.errors.email, bad);
  }
});

test("names are whitespace-normalised; displayName joins first, second and last", () => {
  const r = validateNewEmployee({ ...valid, firstName: "  Asha ", secondName: " Lakshmi  Devi ", lastName: "Rao" });
  assert.ok(r.ok);
  assert.deepEqual([r.value.firstName, r.value.secondName, r.value.lastName, r.value.displayName], ["Asha", "Lakshmi Devi", "Rao", "Asha Lakshmi Devi Rao"]);
  const noSecond = validateNewEmployee(valid);
  assert.ok(noSecond.ok && noSecond.value.secondName === null && noSecond.value.displayName === "Asha Rao");
});

test("names: length limit and control characters rejected", () => {
  assert.equal(validateNewEmployee({ ...valid, lastName: "x".repeat(81) }).ok, false);
  assert.equal(validateNewEmployee({ ...valid, firstName: "As\u0000ha" }).ok, false);
});

test("roles: deduplicated and sorted; non-strings dropped; malformed ids rejected (existence is checked by the server)", () => {
  const r = validateNewEmployee({ ...valid, roles: ["shg-viewer", "console-admin", "shg-viewer", 7] });
  assert.ok(r.ok && JSON.stringify(r.value.roles) === JSON.stringify(["console-admin", "shg-viewer"]));
  for (const roles of [[], "console-admin", ["../users"], ["Console Admin"], [""]]) {
    const res = validateNewEmployee({ ...valid, roles });
    assert.ok(!res.ok && res.errors.roles, JSON.stringify(roles));
  }
});

test("address is optional; provided parts are kept, empty parts dropped, PIN format checked", () => {
  const none = validateNewEmployee(valid);
  assert.ok(none.ok && Object.keys(none.value.address).length === 0);
  const some = validateNewEmployee({ ...valid, address: { doorNo: " 12-3 ", city: "Hyderabad", state: "Telangana", postalCode: "500001", street: "" } });
  assert.ok(some.ok);
  assert.deepEqual(some.value.address, { doorNo: "12-3", city: "Hyderabad", state: "Telangana", postalCode: "500001" });
  const bad = validateNewEmployee({ ...valid, address: { postalCode: "5!" } });
  assert.ok(!bad.ok && bad.errors.postalCode);
});

test("client-supplied identity/status fields are not part of the validated value", () => {
  const r = validateNewEmployee({ ...valid, employeeNumber: "EMP-0001", status: "active", authUid: "x", id: "emp_x" });
  assert.ok(r.ok);
  for (const k of ["employeeNumber", "status", "authUid", "id"]) assert.ok(!(k in r.value), k);
});

test("employee number format", () => {
  assert.deepEqual([1, 42, 9999, 10000].map(formatEmployeeNumber), ["EMP-0001", "EMP-0042", "EMP-9999", "EMP-10000"]);
});
