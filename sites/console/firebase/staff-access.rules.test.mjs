// Emulator tests for the proposed Ozey staff read access
// (firestore.rules.proposed, SHG_DATA_MODEL.md §7).
//
//   pnpm test:rules
//
// Runs only against the local Firestore emulator under a `demo-` project id,
// which cannot reach any real Firebase project.

import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

const here = dirname(fileURLToPath(import.meta.url));
let env;

const now = Timestamp.fromDate(new Date("2026-01-15T10:00:00Z"));

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [groupId, adminUid, memberUid] of [
      ["group-a", "admin-a", "member-a"],
      ["group-b", "admin-b", "member-b"],
    ]) {
      await setDoc(doc(db, "groups", groupId), { groupId, groupName: groupId, adminUid, villageName: "Test", schemaVersion: 1 });
      await setDoc(doc(db, "groups", groupId, "memberUids", memberUid), { memberId: `m-${memberUid}`, role: "member" });
      await setDoc(doc(db, "groups", groupId, "members", `m-${memberUid}`), { id: `m-${memberUid}`, uid: memberUid, name: "M", statusIndex: 0 });
      await setDoc(doc(db, "groups", groupId, "savings", "s1"), { id: "s1", memberId: `m-${memberUid}`, amount: 100, date: now });
      await setDoc(doc(db, "groups", groupId, "repayments", "r1"), { id: "r1", memberId: `m-${memberUid}`, amount: 50, date: now });
      await setDoc(doc(db, "groups", groupId, "loans", "l1"), { id: "l1", memberId: `m-${memberUid}`, principal: 1000, statusIndex: 1, disbursedAt: now });
      await setDoc(doc(db, "groups", groupId, "meetings", "mt1"), { id: "mt1", date: now });
      await setDoc(doc(db, "groups", groupId, "openingRepayments", "o1"), { id: "o1", memberId: `m-${memberUid}`, amount: 10, date: now });
      await setDoc(doc(db, "groups", groupId, "openingBalance", "current"), { totalSavings: 5 });
      await setDoc(doc(db, "groups", groupId, "joinRequests", "j1"), { uid: "someone", status: "pending" });
    }
    await setDoc(doc(db, "users", "member-a"), { phone: "9999999999" });
  });
}

const staff = () => env.authenticatedContext("staff-1", { ozeyStaff: true }).firestore();
const memberOfA = () => env.authenticatedContext("member-a").firestore();
const adminOfA = () => env.authenticatedContext("admin-a").firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-ozey-console-rules",
    firestore: { rules: readFileSync(join(here, "firestore.rules.proposed"), "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
after(() => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed();
});

describe("Ozey staff (ozeyStaff claim) — read access", () => {
  test("can read any group document", async () => {
    await assertSucceeds(getDoc(doc(staff(), "groups", "group-b")));
  });
  test("can list the groups collection ordered by name", async () => {
    await assertSucceeds(getDocs(query(collection(staff(), "groups"), orderBy("groupName"), limit(25))));
  });
  test("can count groups", async () => {
    await assertSucceeds(getCountFromServer(collection(staff(), "groups")));
  });
  for (const name of ["members", "savings", "loans", "repayments", "meetings", "openingRepayments"]) {
    test(`can run a collection-group query on ${name}`, async () => {
      await assertSucceeds(getDocs(query(collectionGroup(staff(), name), limit(10))));
    });
  }
  test("can read a group's opening balance", async () => {
    await assertSucceeds(getDoc(doc(staff(), "groups", "group-a", "openingBalance", "current")));
  });
  test("can filter loans across groups by status", async () => {
    await assertSucceeds(getDocs(query(collectionGroup(staff(), "loans"), where("statusIndex", "in", [0, 1, 2]))));
  });
});

describe("Ozey staff — everything else stays closed", () => {
  test("cannot create a group", async () => {
    await assertFails(setDoc(doc(staff(), "groups", "new"), { groupId: "new", adminUid: "admin-a" }));
  });
  test("cannot update a group", async () => {
    await assertFails(updateDoc(doc(staff(), "groups", "group-a"), { groupName: "x" }));
  });
  test("cannot delete a group", async () => {
    await assertFails(deleteDoc(doc(staff(), "groups", "group-a")));
  });
  test("cannot update a member", async () => {
    await assertFails(updateDoc(doc(staff(), "groups", "group-a", "members", "m-member-a"), { name: "x" }));
  });
  test("cannot write financial records", async () => {
    await assertFails(addDoc(collection(staff(), "groups", "group-a", "savings"), { amount: 1 }));
    await assertFails(updateDoc(doc(staff(), "groups", "group-a", "loans", "l1"), { amountRepaid: 1 }));
  });
  test("cannot read the memberUids index", async () => {
    await assertFails(getDoc(doc(staff(), "groups", "group-a", "memberUids", "member-a")));
  });
  test("cannot read join requests", async () => {
    await assertFails(getDocs(collection(staff(), "groups", "group-a", "joinRequests")));
  });
  test("cannot read another user's registry document", async () => {
    await assertFails(getDoc(doc(staff(), "users", "member-a")));
  });
});

describe("non-staff identities gain nothing", () => {
  test("a signed-in user without the claim cannot list groups", async () => {
    await assertFails(getDocs(collection(env.authenticatedContext("nobody").firestore(), "groups")));
  });
  test("a group member cannot run cross-group collection-group queries", async () => {
    await assertFails(getDocs(collectionGroup(memberOfA(), "savings")));
    await assertFails(getDocs(collectionGroup(memberOfA(), "members")));
  });
  test("a group member still cannot read another group", async () => {
    await assertFails(getDoc(doc(memberOfA(), "groups", "group-b")));
    await assertFails(getDocs(collection(memberOfA(), "groups", "group-b", "savings")));
  });
  test("a group member can still read their own group (unchanged)", async () => {
    await assertSucceeds(getDoc(doc(memberOfA(), "groups", "group-a")));
    await assertSucceeds(getDocs(collection(memberOfA(), "groups", "group-a", "savings")));
  });
  test("a group admin keeps their normal access (unchanged)", async () => {
    await assertSucceeds(getDoc(doc(adminOfA(), "groups", "group-a")));
  });
  test("a non-boolean claim value is not accepted", async () => {
    const forged = env.authenticatedContext("forged", { ozeyStaff: "true" }).firestore();
    await assertFails(getDocs(collection(forged, "groups")));
  });
  test("ozeyStaff: false is not accepted", async () => {
    const off = env.authenticatedContext("off", { ozeyStaff: false }).firestore();
    await assertFails(getDocs(collectionGroup(off, "loans")));
  });
  test("unauthenticated requests are denied", async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(anon, "groups")));
    await assertFails(getDocs(collectionGroup(anon, "savings")));
  });
});
