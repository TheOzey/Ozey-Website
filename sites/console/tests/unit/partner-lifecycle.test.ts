/**
 * Partner entity validation and independence checks that do not need Firebase.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatEmployeeNumber, validateNewEmployee } from "../../src/lib/employees/new-employee.ts";
import {
  formatPartnerNumber,
  PARTNER_CODE_PREFIX,
  validateNewPartner,
} from "../../src/lib/partners/model.ts";
import {
  emptyAssignedShgsResponse,
  emptyCommissionLedgerResponse,
  emptySettlementsResponse,
  unavailablePartnerPerformance,
} from "../../src/lib/partners/availability.ts";
import {
  COMMISSIONS_SETTLE,
  EMPLOYEES_MANAGE,
  hasPermission,
  PARTNERS_MANAGE,
  PARTNERS_READ,
} from "../../src/lib/permissions/permissions.ts";

test("first partner numbers for each type are the documented sequences", () => {
  assert.equal(formatPartnerNumber("digital_sakhi", 1), "OZEY-DS-0001");
  assert.equal(formatPartnerNumber("digital_sarathi", 1), "OZEY-DST-0001");
  assert.notEqual(PARTNER_CODE_PREFIX.digital_sakhi, PARTNER_CODE_PREFIX.digital_sarathi);
});

test("independent counters: same sequence number yields distinct numbers per type", () => {
  for (const n of [1, 2, 99, 10000]) {
    const sakhi = formatPartnerNumber("digital_sakhi", n);
    const sarathi = formatPartnerNumber("digital_sarathi", n);
    assert.notEqual(sakhi, sarathi);
    assert.match(sakhi, /^OZEY-DS-\d+$/);
    assert.match(sarathi, /^OZEY-DST-\d+$/);
  }
});

test("partner IDs stay separate from employee IDs", () => {
  assert.notEqual(formatPartnerNumber("digital_sakhi", 1), formatEmployeeNumber(1));
  assert.match(formatEmployeeNumber(1), /^EMP-/);
  assert.match(formatPartnerNumber("digital_sakhi", 1), /^OZEY-DS-/);
});

test("partner creation does not require employee roles", () => {
  const result = validateNewPartner({
    firstName: "Asha",
    lastName: "Rao",
    mobile: "9876543210",
    partnerType: "digital_sakhi",
  });
  assert.ok(result.ok);
  assert.ok(!("roles" in result.value));
});

test("partner validation rejects roles and client-supplied partner numbers", () => {
  const withRoles = validateNewPartner({
    firstName: "Asha",
    lastName: "Rao",
    mobile: "9876543210",
    partnerType: "digital_sakhi",
    roles: ["console-admin"],
  });
  assert.equal(withRoles.ok, false);

  const smuggled = validateNewPartner({
    firstName: "Asha",
    lastName: "Rao",
    mobile: "9876543210",
    partnerType: "digital_sakhi",
    partnerNumber: "OZEY-DS-0001",
  });
  assert.equal(smuggled.ok, false);
});

test("employee creation remains independent of partner designation", () => {
  const ok = validateNewEmployee({
    firstName: "Asha",
    lastName: "Rao",
    email: "asha@example.com",
    roles: ["console-admin"],
  });
  assert.ok(ok.ok);
  assert.ok(!("designation" in ok.value));
  assert.ok(!("partnerCode" in ok.value));
  assert.ok(!("partnerType" in ok.value));

  // Legacy designation payload is ignored — roles remain the only auth model.
  const withLegacy = validateNewEmployee({
    firstName: "Asha",
    lastName: "Rao",
    email: "asha@example.com",
    roles: ["console-admin"],
    designation: "digital_sakhi",
    partnerCode: "OZEY-DS-0001",
  });
  assert.ok(withLegacy.ok);
  assert.ok(!("designation" in withLegacy.value));
  assert.ok(!("partnerCode" in withLegacy.value));
});

test("partner updates validate territory and optional email", () => {
  const result = validateNewPartner({
    firstName: "Asha",
    secondName: "Lakshmi",
    lastName: "Rao",
    mobile: "+91 98765-43210",
    email: "asha@example.com",
    partnerType: "digital_sarathi",
    state: "Telangana",
    district: "Hyderabad",
    mandal: "Secunderabad",
    village: "Begumpet",
    joinedAt: "2026-01-15",
    address: { city: "Hyderabad", state: "Telangana" },
  });
  assert.ok(result.ok);
  assert.equal(result.value.mobile, "9876543210");
  assert.equal(result.value.partnerType, "digital_sarathi");
  assert.equal(result.value.territory.district, "Hyderabad");
  assert.equal(result.value.joinedAt, "2026-01-15");
});

test("partner category change keeps number format helpers independent (no silent reissue in validators)", () => {
  // Changing type is a server audit event; validators do not mint IDs.
  const sakhi = validateNewPartner({
    firstName: "Asha",
    lastName: "Rao",
    mobile: "9876543210",
    partnerType: "digital_sakhi",
  });
  const sarathi = validateNewPartner({
    firstName: "Asha",
    lastName: "Rao",
    mobile: "9876543210",
    partnerType: "digital_sarathi",
  });
  assert.ok(sakhi.ok && sarathi.ok);
  assert.notEqual(sakhi.value.partnerType, sarathi.value.partnerType);
});

test("partner and employee authorization permissions are distinct", () => {
  const employeeOnly = [EMPLOYEES_MANAGE];
  const partnerOnly = [PARTNERS_MANAGE, PARTNERS_READ];
  assert.equal(hasPermission(employeeOnly, PARTNERS_MANAGE), false);
  assert.equal(hasPermission(employeeOnly, PARTNERS_READ), false);
  assert.equal(hasPermission(partnerOnly, EMPLOYEES_MANAGE), false);
  assert.equal(hasPermission(partnerOnly, PARTNERS_MANAGE), true);
  assert.equal(hasPermission([PARTNERS_READ], PARTNERS_MANAGE), false);
  // partners.* does not imply commissions.read (enforced in partner-authorization.test.ts).
  assert.equal(hasPermission(partnerOnly, "console:commissions.read"), false);
  // Settlement mutations stay vocabulary-only until billing exists.
  assert.equal(COMMISSIONS_SETTLE, "console:commissions.settle");
});

test("partner dashboard unavailable states never fabricate zeros or ledger rows", () => {
  const performance = unavailablePartnerPerformance("awaiting_attribution");
  assert.equal(performance.availability.state, "unavailable");
  for (const metric of [...Object.values(performance.portfolio), ...Object.values(performance.revenue), ...Object.values(performance.commission)]) {
    assert.equal(metric.state, "unavailable");
    assert.ok(!("value" in metric));
  }
  assert.deepEqual(emptyAssignedShgsResponse().items, []);
  assert.deepEqual(emptyCommissionLedgerResponse().items, []);
  const settlements = emptySettlementsResponse();
  assert.equal(settlements.mutationsEnabled, false);
  assert.deepEqual(settlements.items, []);
});
