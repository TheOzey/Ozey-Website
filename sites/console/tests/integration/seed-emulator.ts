// EMULATOR-ONLY synthetic fixtures for the SHG API integration tests.
// Writes SHG-shaped documents (origin/main DTOs) into demo-ozey-shg and two
// Workforce employees into demo-ozey-workforce. Refuses to run without the
// Firestore emulator, and only ever targets demo- project ids.
import { Firestore, Timestamp } from "@google-cloud/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Refusing: FIRESTORE_EMULATOR_HOST is not set");

const shg = new Firestore({ projectId: "demo-ozey-shg" });
const workforce = new Firestore({ projectId: "demo-ozey-workforce" });
const at = (iso: string) => Timestamp.fromDate(new Date(iso));
const now = at("2026-09-30T05:00:00Z");

async function put(db: Firestore, path: string, data: Record<string, unknown>) {
  await db.doc(path).set(data);
}

async function seedShg() {
  const groups = [
    { id: "grp_a", name: "Asha SHG", village: "Kothapalli" },
    { id: "grp_b", name: "Deepam SHG", village: "Rampur" },
    { id: "grp_c", name: "Jyothi SHG", village: "Nandigama" },
  ];
  for (const g of groups) {
    await put(shg, `groups/${g.id}`, {
      groupId: g.id, inviteCode: "SECRET1", adminUid: "admin-uid", groupName: g.name, villageName: g.village,
      formationDate: at("2025-01-01T05:00:00Z"), monthlySavings: 500, meetingDay: 5, loanInterest: 2, latePenalty: 20,
      paymentGraceDays: 3, hasBankAccount: true, accountHolder: "X", accountNumber: "000111", ifscCode: "SBIN0", createdAt: now, updatedAt: now, schemaVersion: 1,
    });
  }
  const member = (g: string, id: string, name: string, statusIndex = 0, roleIndex = 0) =>
    put(shg, `groups/${g}/members/${id}`, {
      id, uid: "", phone: "9848012345", name, roleIndex, statusIndex, hasAdminAccess: roleIndex === 2, monthlyTarget: 500, totalSavings: 1500,
      idNumber: "AADHAAR", address: "Street", joinedAt: at("2025-02-01T05:00:00Z"), approvedAt: at("2025-02-01T05:00:00Z"), approvedBy: "admin-uid",
      joinMethodIndex: 0, leftAt: statusIndex === 1 ? at("2026-07-01T05:00:00Z") : null, exitTypeIndex: null, settlementStatusIndex: null, createdAt: now, updatedAt: now, schemaVersion: 1,
    });
  await member("grp_a", "m1", "Lakshmi Devi", 0, 2);
  await member("grp_a", "m2", "Padma Rani");
  await member("grp_a", "m3", "Sujatha B");
  await member("grp_a", "m4", "Vijaya L", 1);
  await member("grp_b", "n1", "Geetha N", 0, 2);
  await member("grp_b", "n2", "Usha K");
  await member("grp_c", "c1", "Aruna T", 0, 2);

  const saving = (g: string, id: string, memberId: string, name: string, amount: number, period: string, reversalOf: string | null = null) =>
    put(shg, `groups/${g}/savings/${id}`, {
      id, memberId, memberName: name, amount, date: at(`${period}-05T05:00:00Z`), period, notes: reversalOf ? "Entered twice" : null,
      recordedBy: "admin-uid", reversalOf, meetingId: null, submissionId: `sub_${id}`, createdAt: now, updatedAt: now, schemaVersion: 2,
    });
  // grp_a: 3 members × Jul–Sep × 500 = 4500, then one −500 reversal in September → 4000.
  for (const [mid, name] of [["m1", "Lakshmi Devi"], ["m2", "Padma Rani"], ["m3", "Sujatha B"]] as const) {
    for (const p of ["2026-07", "2026-08", "2026-09"]) await saving("grp_a", `s_${mid}_${p}`, mid, name, 500, p);
  }
  await saving("grp_a", "s_rev_1", "m2", "Padma Rani", -500, "2026-09", "s_m2_2026-09");
  // grp_b: 2 members × 12 months × 300 = 7200 (enough rows to need a second page).
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(2025, 9 + i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  for (const [mid, name] of [["n1", "Geetha N"], ["n2", "Usha K"]] as const) {
    for (const p of months) await saving("grp_b", `s_${mid}_${p}`, mid, name, 300, p);
  }

  const loan = (id: string, memberId: string, name: string, principal: number, rate: number, disbursed: string, due: string, repaid: number, statusIndex: number, interestModelIndex: number, repaymentModeIndex: number) =>
    put(shg, `groups/grp_a/loans/${id}`, {
      id, memberId, memberName: name, principal, interestRate: rate, amountRepaid: repaid, disbursedAt: at(disbursed), dueDate: at(due), statusIndex,
      interestModelIndex, repaymentModeIndex, purpose: null, meetingId: null, createdAt: now, updatedAt: now, schemaVersion: 3,
    });
  await loan("l_flat", "m1", "Lakshmi Devi", 10000, 2, "2026-03-08T05:00:00Z", "2026-09-08T05:00:00Z", 2000, 1, 0, 0); // 6 mo flat: due 11200, out 9200
  await loan("l_rb", "m2", "Padma Rani", 12000, 2, "2026-01-08T05:00:00Z", "2027-01-08T05:00:00Z", 0, 2, 1, 0); // 12 mo reducing: due 13560
  await loan("l_flex", "m3", "Sujatha B", 8000, 1, "2026-02-08T05:00:00Z", "2026-02-08T05:00:00Z", 500, 1, 0, 1); // flexible: unknown
  await loan("l_repaid", "m1", "Lakshmi Devi", 5000, 2, "2025-01-08T05:00:00Z", "2025-06-08T05:00:00Z", 5500, 3, 0, 0);

  const repayments = [
    ["r1", "l_flat", "m1", "Lakshmi Devi", 1000, "2026-08-10T05:00:00Z"],
    ["r2", "l_flat", "m1", "Lakshmi Devi", 1000, "2026-09-10T05:00:00Z"],
    ["r0", "l_repaid", "m1", "Lakshmi Devi", 5500, "2025-06-08T05:00:00Z"], // repaid in full: amountRepaid 5500 = totalDue
    ["r_flex", "l_flex", "m3", "Sujatha B", 500, "2026-04-08T05:00:00Z"], // flexible: principal part not derivable
  ] as const;
  for (const [id, loanId, memberId, memberName, amount, date] of repayments) {
    await put(shg, `groups/grp_a/repayments/${id}`, {
      id, loanId, memberId, memberName, amount, date: at(date), notes: null, reversalOf: null,
      meetingId: null, submissionId: `sub_${id}`, createdAt: now, updatedAt: now, schemaVersion: 2,
    });
  }
  await put(shg, "groups/grp_a/monthlyCharges/mlf_sub1_2026-08", {
    id: "mlf_sub1_2026-08", memberId: "m3", memberName: "Sujatha B", kind: "lateFee", amount: 20, period: "2026-09", appliesToPeriod: "2026-08",
    date: at("2026-09-06T05:00:00Z"), reversalOf: null, recordedBy: "admin-uid", meetingId: null, schemaVersion: 2,
  });
  await put(shg, "groups/grp_a/openingRepayments/or1", {
    id: "or1", memberId: "m4", kind: "loan", amount: 1500, period: "2026-05", date: at("2026-05-09T05:00:00Z"), reversalOf: null, meetingId: null, submissionId: "sub_or1", schemaVersion: 2,
  });
  // Monthly interest on m4's opening loan: an interest collection, never a principal repayment.
  await put(shg, "groups/grp_a/openingRepayments/or2", {
    id: "or2", memberId: "m4", kind: "interest", amount: 150, period: "2026-06", date: at("2026-06-09T05:00:00Z"), reversalOf: null, meetingId: null, submissionId: "sub_or2", schemaVersion: 4,
  });
  for (const [period, income, spent] of [["2026-08", 0, 0], ["2026-09", 100, 40]] as const) {
    await put(shg, `groups/grp_a/meetings/mtg_${period}`, {
      id: `mtg_${period}`, date: at(`${period}-05T05:00:00Z`), period, attendeeIds: ["m1", "m2", "m3"], totalMembers: 3, savingsCollected: 1500,
      loansDisbursed: 0, loansRepaid: 1000, extraIncome: income, moneySpent: spent, extraIncomeDesc: null, moneySpentDesc: null,
      attributedRecords: true, createdAt: now, updatedAt: now, schemaVersion: 2,
    });
  }
  await put(shg, "groups/grp_a/monthlyClosures/2026-08", {
    id: "2026-08", period: "2026-08", statusIndex: 1, closingBalance: 41000, totalSavings: 1500, totalLoanRepayments: 1000, totalInterest: 0,
    totalExpenses: 0, totalOtherIncome: 0, totalLateFines: 0, closedAt: at("2026-09-01T05:00:00Z"), closedBy: "admin-uid", reopenedAt: null,
    reopenedBy: null, notes: null, createdAt: now, updatedAt: now, schemaVersion: 2,
  });
  await put(shg, "groups/grp_a/openingBalance/current", {
    totalSavings: 42000, outstandingLoans: 9000, totalInterestCollected: 3100, otherIncome: 0, otherExpense: 0, totalLoansGiven: 30000,
    // Per-member allocations keyed by member document id, summing to the group totals (as in production).
    totalLateFeesCollected: 0, memberSavings: { m1: 14000, m2: 14000, m3: 14000 }, memberLoanTaken: { m1: 10000, m4: 20000 },
    memberLoanBalance: { m4: 7500 }, memberLateFeesDue: {}, memberLateFeesPaid: {}, memberInterestPaid: { m1: 1000, m4: 2100 },
    memberLoanBalanceOriginal: { m4: 9000 }, memberLateFeesDueOriginal: {}, updatedAt: now, createdAt: at("2026-06-01T05:00:00Z"), schemaVersion: 2,
  });
  for (const [from, savings] of [["2025-01", 500], ["2026-09", 600]] as const) {
    await put(shg, `groups/grp_a/ruleVersions/${from}_r0_admin-uid`, {
      id: `${from}_r0_admin-uid`, effectiveFrom: from, monthlySavings: savings, latePenalty: 20, meetingDay: 5, graceDays: 3, revision: 0,
      updatedAt: now, updatedByUid: "admin-uid", schemaVersion: 1,
    });
  }
}

async function seedWorkforce() {
  const base = { displayName: "Test", authUid: null, createdAt: now, createdBy: "test", updatedAt: now, updatedBy: "test", lastSignInAt: null };
  await put(workforce, "roles/shg-viewer", { product: "shg", permissions: ["shg:read"] });
  await put(workforce, "roles/console-admin", {
    product: "console",
    permissions: [
      "console:employees.manage",
      "console:audit.read",
      "console:partners.read",
      "console:partners.manage",
      "console:commissions.read",
      "console:commissions.settle",
    ],
  });
  // Employees manage without partner rights — used to assert Partner Code assignment is gated.
  await put(workforce, "roles/console-hr", {
    product: "console",
    permissions: ["console:employees.manage", "console:audit.read"],
  });
  await put(workforce, "employees/emp_reader", { ...base, email: "reader@example.test", status: "invited", roles: ["console-admin", "shg-viewer"] });
  await put(workforce, "employees/emp_noshg", { ...base, email: "noshg@example.test", status: "invited", roles: ["console-admin"] });
  await put(workforce, "employees/emp_hr", { ...base, email: "hr@example.test", status: "invited", roles: ["console-hr"] });
  // shg:read only: may use SHG, must not be able to manage employees.
  await put(workforce, "employees/emp_viewer", { ...base, email: "viewer@example.test", status: "invited", roles: ["shg-viewer"] });
}

await seedShg();
await seedWorkforce();
console.log("emulator fixtures seeded");
