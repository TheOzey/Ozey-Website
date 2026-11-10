import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMMISSION_POLICY_V1,
  formatPartnerNumber,
  isPartnerType,
  PARTNER_CODE_PREFIX,
} from "../../src/lib/partners/model.ts";
import {
  emptyAssignedShgsResponse,
  emptyCommissionLedgerResponse,
  emptySettlementsResponse,
  unavailablePartnerPerformance,
} from "../../src/lib/partners/availability.ts";

test("partner number format: independent Sakhi and Sarathi sequences", () => {
  assert.equal(formatPartnerNumber("digital_sakhi", 1), "OZEY-DS-0001");
  assert.equal(formatPartnerNumber("digital_sarathi", 1), "OZEY-DST-0001");
  assert.equal(formatPartnerNumber("digital_sakhi", 42), "OZEY-DS-0042");
  assert.equal(formatPartnerNumber("digital_sarathi", 10000), "OZEY-DST-10000");
  assert.throws(() => formatPartnerNumber("digital_sakhi", 0));
  assert.notEqual(PARTNER_CODE_PREFIX.digital_sakhi, PARTNER_CODE_PREFIX.digital_sarathi);
});

test("partner type helpers", () => {
  assert.equal(isPartnerType("digital_sakhi"), true);
  assert.equal(isPartnerType("digital_sarathi"), true);
  assert.equal(isPartnerType("other"), false);
});

test("approved commission policy is fixed at 50% / 25%", () => {
  assert.equal(COMMISSION_POLICY_V1.newOnboardingRate, 0.5);
  assert.equal(COMMISSION_POLICY_V1.renewalRate, 0.25);
  assert.equal(COMMISSION_POLICY_V1.version, "v1");
});

test("partner dashboard contracts never fabricate ready zeros", () => {
  const performance = unavailablePartnerPerformance("awaiting_attribution");
  assert.equal(performance.availability.state, "unavailable");
  for (const metric of Object.values(performance.portfolio)) {
    assert.equal(metric.state, "unavailable");
    assert.ok(!("value" in metric));
  }
  for (const metric of Object.values(performance.revenue)) {
    assert.equal(metric.state, "unavailable");
  }
  for (const metric of Object.values(performance.commission)) {
    assert.equal(metric.state, "unavailable");
  }

  const assigned = emptyAssignedShgsResponse();
  assert.deepEqual(assigned.items, []);
  assert.equal(assigned.availability.state, "unavailable");

  const ledger = emptyCommissionLedgerResponse();
  assert.deepEqual(ledger.items, []);
  assert.equal(ledger.policy.newOnboardingRate, 0.5);

  const settlements = emptySettlementsResponse();
  assert.equal(settlements.mutationsEnabled, false);
  assert.deepEqual(settlements.items, []);
});
