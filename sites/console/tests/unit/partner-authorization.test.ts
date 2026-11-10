/**
 * Server-side partner / commission authorization boundaries.
 * These helpers gate partner APIs and partner profile pages.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canManagePartners,
  canReadCommissions,
  canReadPartners,
  canSettleCommissions,
  partnerSectionAllowed,
} from "../../src/lib/partners/authorization.ts";
import { emptySettlementsResponse } from "../../src/lib/partners/availability.ts";
import {
  COMMISSIONS_READ,
  COMMISSIONS_SETTLE,
  EMPLOYEES_MANAGE,
  PARTNERS_MANAGE,
  PARTNERS_READ,
} from "../../src/lib/permissions/permissions.ts";

const partnersReadOnly = [PARTNERS_READ] as const;
const partnersManageOnly = [PARTNERS_MANAGE] as const;
const partnersReadAndManage = [PARTNERS_READ, PARTNERS_MANAGE] as const;
/** Explicit boundary: partner access without commissions. */
const partnersWithoutCommissions = [PARTNERS_READ, PARTNERS_MANAGE] as const;
const commissionsReadOnly = [COMMISSIONS_READ] as const;
const consoleAdminLike = [EMPLOYEES_MANAGE, PARTNERS_READ, PARTNERS_MANAGE, COMMISSIONS_READ, COMMISSIONS_SETTLE] as const;
const none: string[] = [];

test("partners.read grants directory, overview, performance and assigned SHGs", () => {
  for (const section of ["directory", "overview", "performance", "assigned-shgs"] as const) {
    assert.equal(partnerSectionAllowed(partnersReadOnly, section), true, section);
  }
  assert.equal(canReadPartners(partnersReadOnly), true);
  assert.equal(canManagePartners(partnersReadOnly), false);
});

test("partners.manage implies partner read but not commissions.read", () => {
  assert.equal(canReadPartners(partnersManageOnly), true);
  assert.equal(canManagePartners(partnersManageOnly), true);
  assert.equal(canReadCommissions(partnersManageOnly), false);
  assert.equal(partnerSectionAllowed(partnersManageOnly, "commission"), false);
  assert.equal(partnerSectionAllowed(partnersManageOnly, "settlements"), false);
  assert.equal(partnerSectionAllowed(partnersManageOnly, "manage"), true);
});

test("partners.read without commissions.read is denied commission ledger and settlements", () => {
  assert.equal(canReadPartners(partnersWithoutCommissions), true);
  assert.equal(canReadCommissions(partnersWithoutCommissions), false);
  assert.equal(partnerSectionAllowed(partnersWithoutCommissions, "directory"), true);
  assert.equal(partnerSectionAllowed(partnersWithoutCommissions, "overview"), true);
  assert.equal(partnerSectionAllowed(partnersWithoutCommissions, "performance"), true);
  assert.equal(partnerSectionAllowed(partnersWithoutCommissions, "assigned-shgs"), true);
  assert.equal(partnerSectionAllowed(partnersWithoutCommissions, "commission"), false);
  assert.equal(partnerSectionAllowed(partnersWithoutCommissions, "settlements"), false);
});

test("commissions.read independently grants commission and settlements sections", () => {
  assert.equal(canReadCommissions(commissionsReadOnly), true);
  assert.equal(canReadPartners(commissionsReadOnly), false);
  assert.equal(partnerSectionAllowed(commissionsReadOnly, "commission"), true);
  assert.equal(partnerSectionAllowed(commissionsReadOnly, "settlements"), true);
  assert.equal(partnerSectionAllowed(commissionsReadOnly, "directory"), false);
  assert.equal(partnerSectionAllowed(commissionsReadOnly, "overview"), false);
  assert.equal(partnerSectionAllowed(commissionsReadOnly, "manage"), false);
});

test("mutations require partners.manage; partners.read alone cannot manage", () => {
  assert.equal(partnerSectionAllowed(partnersReadOnly, "manage"), false);
  assert.equal(partnerSectionAllowed(partnersReadAndManage, "manage"), true);
  assert.equal(partnerSectionAllowed(commissionsReadOnly, "manage"), false);
  assert.equal(partnerSectionAllowed(none, "manage"), false);
});

test("settlement mutations stay disabled even with commissions.settle vocabulary", () => {
  assert.equal(canSettleCommissions(consoleAdminLike), false);
  assert.equal(canSettleCommissions([COMMISSIONS_SETTLE]), false);
  assert.equal(emptySettlementsResponse().mutationsEnabled, false);
});

test("employees.manage alone grants no partner or commission access", () => {
  const employeeOnly = [EMPLOYEES_MANAGE];
  assert.equal(canReadPartners(employeeOnly), false);
  assert.equal(canManagePartners(employeeOnly), false);
  assert.equal(canReadCommissions(employeeOnly), false);
  for (const section of ["directory", "overview", "performance", "assigned-shgs", "commission", "settlements", "manage"] as const) {
    assert.equal(partnerSectionAllowed(employeeOnly, section), false, section);
  }
});

test("permission string constants stay in the console: namespace", () => {
  assert.equal(PARTNERS_READ, "console:partners.read");
  assert.equal(PARTNERS_MANAGE, "console:partners.manage");
  assert.equal(COMMISSIONS_READ, "console:commissions.read");
  assert.equal(COMMISSIONS_SETTLE, "console:commissions.settle");
});
