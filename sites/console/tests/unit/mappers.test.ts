import assert from "node:assert/strict";
import { test } from "node:test";
import { Timestamp } from "@google-cloud/firestore";
import {
  type DocLike,
  monthlyChargeToTransaction,
  openingRepaymentToTransaction,
  toGroup,
  toLoan,
  toMeeting,
  toMember,
  toMonthlyClosure,
  toOpeningBalance,
  toOpeningMemberMaps,
  toRuleVersion,
  savingToTransaction,
} from "../../src/lib/server/shg/core/mappers.ts";

const ts = (iso: string) => Timestamp.fromDate(new Date(iso));
function doc(path: string, data: Record<string, unknown>): DocLike {
  const parts = path.split("/");
  const groupId = parts[0] === "groups" && parts.length > 2 ? parts[1] : null;
  return { id: parts.at(-1)!, ref: { path, parent: { parent: groupId ? { id: groupId } : null } }, data: () => data };
}

test("group: maps settings, never exposes bank details / invite code / adminUid", () => {
  const g = toGroup(doc("groups/g1", { groupName: "Asha", villageName: "Kothapalli", monthlySavings: 500, loanInterest: 2, accountNumber: "123", ifscCode: "X", inviteCode: "SECRET", adminUid: "u1" }));
  assert.equal(g.name, "Asha");
  assert.equal(g.monthlySavings, 500);
  for (const k of ["accountNumber", "ifscCode", "inviteCode", "adminUid", "accountHolder"]) assert.equal(k in g, false, k);
});
test("member: enum indexes, group from path, no idNumber/address", () => {
  const m = toMember(doc("groups/g1/members/m1", { name: "Lakshmi", roleIndex: 2, statusIndex: 1, hasAdminAccess: true, idNumber: "ID", address: "A" }));
  assert.equal(m.groupId, "g1");
  assert.equal(m.role, "president");
  assert.equal(m.status, "left");
  assert.equal(m.isAdmin, true);
  assert.equal("idNumber" in m || "address" in m, false);
});
test("loan: a v1 document without the new indexes reads as flat EMI (LoanDto.fromMap defaults)", () => {
  const l = toLoan(doc("groups/g1/loans/l1", { memberId: "m1", principal: 20000, interestRate: 2, amountRepaid: 12000, disbursedAt: ts("2025-11-08T05:00:00Z"), dueDate: ts("2026-09-08T05:00:00Z"), statusIndex: 1 }));
  assert.equal(l.interestModel, "flat");
  assert.equal(l.repaymentMode, "emi");
  assert.equal(l.outstanding, 12000);
});
test("loan: reducing balance and flexible from interestModelIndex / repaymentModeIndex", () => {
  const rb = toLoan(doc("groups/g1/loans/l2", { principal: 12000, interestRate: 2, amountRepaid: 0, disbursedAt: ts("2026-01-08T05:00:00Z"), dueDate: ts("2027-01-08T05:00:00Z"), interestModelIndex: 1, repaymentModeIndex: 0, meetingId: "mt1" }));
  assert.equal(rb.interestModel, "reducingBalance");
  assert.equal(rb.totalInterest, 1560);
  assert.equal(rb.meetingId, "mt1");
  const fx = toLoan(doc("groups/g1/loans/l3", { principal: 8000, interestRate: 1, amountRepaid: 500, disbursedAt: ts("2026-02-08T05:00:00Z"), dueDate: ts("2026-02-08T05:00:00Z"), repaymentModeIndex: 1 }));
  assert.equal(fx.repaymentMode, "flexible");
  assert.equal(fx.interestKnown, false);
  assert.equal(fx.outstanding, null);
  assert.equal(fx.totalDue, null);
});
test("savings reversal is negative and flagged", () => {
  const t = savingToTransaction(doc("groups/g1/savings/s1", { memberId: "m1", amount: -500, reversalOf: "s0", period: "2026-09", date: ts("2026-09-06T05:00:00Z"), submissionId: "x" }));
  assert.equal(t.isReversal, true);
  assert.equal(t.amount, -500);
  assert.equal(t.kind, "saving");
  assert.equal(t.key, "saving:g1:s1");
});
test("monthly charge: kind defaults to lateFee, signed amount, appliesToPeriod kept", () => {
  const t = monthlyChargeToTransaction(doc("groups/g1/monthlyCharges/c1", { memberId: "m1", amount: 20, period: "2026-09", appliesToPeriod: "2026-08", date: ts("2026-09-06T05:00:00Z") }));
  assert.equal(t.chargeKind, "lateFee");
  assert.equal(t.appliesToPeriod, "2026-08");
  assert.equal(t.isReversal, false);
});
test("meeting: attendance and attributedRecords", () => {
  const m = toMeeting(doc("groups/g1/meetings/mt1", { attendeeIds: ["a", "b"], totalMembers: 3, attributedRecords: true }));
  assert.equal(m.attendeeCount, 2);
  assert.equal(m.attributedRecords, true);
});
test("closure status and late fines; rule version requires effectiveFrom", () => {
  const c = toMonthlyClosure(doc("groups/g1/monthlyClosures/2026-08", { period: "2026-08", statusIndex: 1, closingBalance: 9000, totalLateFines: 40 }));
  assert.equal(c.status, "closed");
  assert.equal(c.totalLateFines, 40);
  assert.equal(toRuleVersion(doc("groups/g1/ruleVersions/x", { monthlySavings: 500 })), null);
  assert.equal(toRuleVersion(doc("groups/g1/ruleVersions/y", { effectiveFrom: "2026-01", revision: 2 }))?.revision, 2);
});

test("opening balance: totals, as-of date, and per-member maps keyed by member id (numbers only, like OpeningBalanceDto.readMap)", () => {
  const snap = {
    exists: true,
    data: () => ({
      totalSavings: 528000, totalLoansGiven: 460000, outstandingLoans: 304000, createdAt: ts("2026-09-15T16:18:23Z"),
      memberSavings: { m1: 44000, m2: "44000", m3: null }, memberLoanBalanceOriginal: { m1: 100000 }, memberLateFeesDue: "garbage",
    }),
  };
  const balance = toOpeningBalance(snap)!;
  assert.deepEqual([balance.totalSavings, balance.totalLoansGiven, balance.asOf?.toISOString()], [528000, 460000, "2026-09-15T16:18:23.000Z"]);
  const maps = toOpeningMemberMaps(snap);
  assert.deepEqual(maps.savings, { m1: 44000 });
  assert.deepEqual(maps.loanBalanceOriginal, { m1: 100000 });
  assert.deepEqual(maps.lateFeesDue, {});
  assert.deepEqual(toOpeningMemberMaps({ exists: false, data: () => undefined }).savings, {});
  assert.equal(toOpeningBalance({ exists: false, data: () => undefined }), null);
});

test("opening repayment: kind defaults to loan (OpeningRepaymentDto.fromMap); interest kind kept", () => {
  assert.equal(openingRepaymentToTransaction(doc("groups/g/openingRepayments/a", { memberId: "m1", amount: 500 })).openingKind, "loan");
  const t = openingRepaymentToTransaction(doc("groups/g/openingRepayments/b", { memberId: "m1", kind: "interest", amount: 300, period: "2026-10" }));
  assert.deepEqual([t.openingKind, t.groupId, t.memberName, t.amount], ["interest", "g", null, 300]);
});
