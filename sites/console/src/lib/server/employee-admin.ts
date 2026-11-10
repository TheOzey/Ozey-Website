import "server-only";
import { randomBytes } from "node:crypto";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { formatEmployeeNumber, type NewEmployee } from "@/lib/employees/new-employee";
import { EMPLOYEES_MANAGE } from "@/lib/permissions/permissions";
import { forgetEmployee } from "./employees";
import { workforceAuth, workforceDb } from "./workforce-admin";

/**
 * Employee creation (Workforce Firestore, server only — client rules deny all).
 *
 * Identity is unchanged: the document id stays "emp_<random>" (the stable
 * employeeId used for Auth linking, product tokens and audit `actor`). The
 * new `employeeNumber` ("EMP-0001") is a human-readable label on that same
 * record, not a second identity.
 *
 * Numbers come from a monotonic counter (`counters/employees.next`) advanced
 * inside the same transaction that creates the employee, so they are never
 * reused (even after a record is removed), never derived from a row count,
 * and concurrent creations serialise on the counter document: Firestore
 * retries a conflicting transaction, which then re-reads the counter and
 * re-checks the email.
 */

export class DuplicateEmployeeEmailError extends Error {
  constructor() {
    super("An employee with this email already exists");
    this.name = "DuplicateEmployeeEmailError";
  }
}

export class UnknownRoleError extends Error {
  constructor(readonly roles: string[]) {
    super("One or more roles do not exist");
    this.name = "UnknownRoleError";
  }
}

export interface CreatedEmployee {
  employeeNumber: string;
  displayName: string;
  email: string;
  roles: string[];
  status: "invited";
}

type EmployeeMutationActor = { employeeId: string; permissions: readonly string[] };

const COUNTER = "counters/employees";

export async function createEmployee(
  input: NewEmployee,
  actor: EmployeeMutationActor,
  db: Firestore = workforceDb(),
): Promise<CreatedEmployee> {
  const employeeId = `emp_${randomBytes(9).toString("base64url")}`;
  const counterRef = db.doc(COUNTER);
  const employeeRef = db.collection("employees").doc(employeeId);

  return db.runTransaction(async (tx) => {
    // Reads first (a transaction's reads must precede its writes).
    const [counter, sameEmail, roleSnaps] = await Promise.all([
      tx.get(counterRef),
      tx.get(db.collection("employees").where("email", "==", input.email).limit(1)),
      tx.getAll(...input.roles.map((r) => db.collection("roles").doc(r))),
    ]);
    if (!sameEmail.empty) throw new DuplicateEmployeeEmailError();
    const missing = roleSnaps.filter((s) => !s.exists).map((s) => s.id);
    if (missing.length > 0) throw new UnknownRoleError(missing);

    const next = counter.get("next");
    const sequence = Number.isSafeInteger(next) && next > 0 ? (next as number) : 1;
    const employeeNumber = formatEmployeeNumber(sequence);
    // Defence in depth: a number already on a record (e.g. a counter restored
    // from a backup) must never be issued twice.
    const taken = await tx.get(db.collection("employees").where("employeeNumber", "==", employeeNumber).limit(1));
    if (!taken.empty) throw new Error("Employee number counter is behind existing records");

    const now = FieldValue.serverTimestamp();
    tx.create(employeeRef, {
      // Existing Workforce schema — what admission, sessions and the directory read.
      email: input.email,
      displayName: input.displayName,
      status: "invited",
      roles: input.roles,
      authUid: null,
      createdAt: now,
      createdBy: actor.employeeId,
      updatedAt: now,
      updatedBy: actor.employeeId,
      lastSignInAt: null,
      // Additive fields.
      employeeNumber,
      firstName: input.firstName,
      secondName: input.secondName,
      lastName: input.lastName,
      address: input.address,
    });
    tx.set(counterRef, { next: sequence + 1, updatedAt: now }, { merge: true });
    // Same append-only audit log and action name the Workforce seed script uses.
    tx.create(db.collection("auditLog").doc(), {
      at: now,
      action: "employee-created",
      actor: actor.employeeId,
      target: employeeId,
      employeeNumber,
      roles: input.roles,
    });
    return {
      employeeNumber,
      displayName: input.displayName,
      email: input.email,
      roles: input.roles,
      status: "invited" as const,
    };
  });
}

// ── Edit and offboard ─────────────────────────────────────────────────────────
//
// Employees are addressed by their permanent employeeNumber ("EMP-0001"), never
// by document id, so the browser never sees internal identifiers. The number,
// document id, createdAt and createdBy are never written here.
//
// "Delete" is the schema's own terminal state, status "offboarded"
// (OZEY_WORKFORCE_ARCHITECTURE.md §3: "record kept for audit, never deleted or
// reused"). Admission already refuses offboarded employees; their sessions are
// revoked immediately. The counter is never touched, so the number is never
// reissued.

export class EmployeeNotFoundError extends Error {
  constructor() {
    super("Employee not found");
    this.name = "EmployeeNotFoundError";
  }
}

export class EmployeeOffboardedError extends Error {
  constructor() {
    super("Employee has been deleted");
    this.name = "EmployeeOffboardedError";
  }
}

/** A change that would lock the acting administrator out of the Console. */
export class SelfLockoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SelfLockoutError";
  }
}

/**
 * Ends every Workforce session of `uid`. Firebase revocation has one-second
 * precision and only revokes sessions whose auth_time is strictly earlier than
 * the revocation second, so wait out the current second first (the same rule
 * sign-out applies). The status change already rejects these sessions on the
 * next request; this makes the cut-off independent of any cache.
 */
async function revokeAllSessions(uid: string) {
  const wait = Math.ceil(Date.now() / 1000) * 1000 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  await workforceAuth().revokeRefreshTokens(uid);
  forgetEmployee(uid);
}

async function employeeByNumber(tx: FirebaseFirestore.Transaction | null, db: Firestore, employeeNumber: string) {
  const query = db.collection("employees").where("employeeNumber", "==", employeeNumber).limit(2);
  const snap = tx ? await tx.get(query) : await query.get();
  // Zero or ambiguous matches are both "not found": never act on a guess.
  if (snap.size !== 1) throw new EmployeeNotFoundError();
  return snap.docs[0];
}

export interface EditableEmployee {
  employeeNumber: string;
  firstName: string;
  secondName: string;
  lastName: string;
  email: string;
  roles: string[];
  address: Record<string, string>;
  status: string;
  linked: boolean;
}

/** The editable view of an employee (no document id, uid or author ids). */
export async function getEditableEmployee(employeeNumber: string, db: Firestore = workforceDb()): Promise<EditableEmployee> {
  const d = await employeeByNumber(null, db, employeeNumber);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  let firstName = str(d.get("firstName"));
  let lastName = str(d.get("lastName"));
  // Records created before name parts existed carry only displayName: offer a
  // split as a starting point; the editor confirms it.
  if (!firstName && !lastName) {
    const [first = "", ...rest] = str(d.get("displayName")).trim().split(/\s+/);
    firstName = first;
    lastName = rest.join(" ");
  }
  const address = d.get("address");
  return {
    employeeNumber,
    firstName,
    secondName: str(d.get("secondName")),
    lastName,
    email: str(d.get("email")),
    roles: Array.isArray(d.get("roles")) ? (d.get("roles") as unknown[]).filter((r): r is string => typeof r === "string") : [],
    address:
      address && typeof address === "object"
        ? Object.fromEntries(Object.entries(address as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string"))
        : {},
    status: str(d.get("status")),
    linked: Boolean(d.get("authUid")),
  };
}

export interface UpdateResult {
  employee: Omit<CreatedEmployee, "status"> & { status: string };
  /** Fields that changed (empty when the submission matched the record). */
  changed: string[];
  /** The email changed on a linked account: re-invited, previous sessions revoked. */
  reinvited: boolean;
}

export async function updateEmployee(
  employeeNumber: string,
  input: NewEmployee,
  actor: EmployeeMutationActor,
  db: Firestore = workforceDb(),
): Promise<UpdateResult> {
  const result = await db.runTransaction(async (tx) => {
    const doc = await employeeByNumber(tx, db, employeeNumber);
    const current = doc.data();
    if (current.status === "offboarded") throw new EmployeeOffboardedError();
    const emailChanged = current.email !== input.email;
    const [sameEmail, roleSnaps] = await Promise.all([
      emailChanged ? tx.get(db.collection("employees").where("email", "==", input.email).limit(1)) : Promise.resolve(null),
      tx.getAll(...input.roles.map((r) => db.collection("roles").doc(r))),
      // Email changes take the same lock as creation (the counter document), so
      // a concurrent create or edit cannot claim the same email.
      emailChanged ? tx.get(db.doc(COUNTER)) : Promise.resolve(null),
    ]);
    if (sameEmail && !sameEmail.empty) throw new DuplicateEmployeeEmailError();
    const missing = roleSnaps.filter((s) => !s.exists).map((s) => s.id);
    if (missing.length > 0) throw new UnknownRoleError(missing);

    if (doc.id === actor.employeeId) {
      if (emailChanged) throw new SelfLockoutError("You can't change your own email address.");
      // Permissions are resolved from the roles collection, exactly as sessions do.
      const keepsManage = roleSnaps.some((s) => ((s.get("permissions") as unknown[] | undefined) ?? []).includes(EMPLOYEES_MANAGE));
      if (!keepsManage) throw new SelfLockoutError("You can't remove your own employee-management access.");
    }

    const next = {
      firstName: input.firstName,
      secondName: input.secondName,
      lastName: input.lastName,
      displayName: input.displayName,
      email: input.email,
      roles: input.roles,
      address: input.address,
    };
    const before: Record<string, unknown> = {
      firstName: current.firstName ?? null,
      secondName: current.secondName ?? null,
      lastName: current.lastName ?? null,
      displayName: current.displayName ?? null,
      email: current.email ?? null,
      roles: current.roles ?? [],
      address: current.address ?? {},
    };
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, value] of Object.entries(next)) {
      const was = key === "roles" ? [...((before.roles as string[]) ?? [])].sort() : before[key];
      if (JSON.stringify(was) !== JSON.stringify(value)) changes[key] = { from: before[key], to: value };
    }
    const changed = Object.keys(changes);
    const linkedUid = typeof current.authUid === "string" && current.authUid ? current.authUid : null;
    const reinvited = emailChanged && linkedUid !== null;

    if (changed.length > 0) {
      const now = FieldValue.serverTimestamp();
      tx.update(doc.ref, {
        ...next,
        updatedAt: now,
        updatedBy: actor.employeeId,
        // A linked Google account belongs to the old email: unlink it so the new
        // address must sign in (and be admitted) before the record is active again.
        ...(reinvited ? { authUid: null, status: "invited" } : {}),
      });
      if (emailChanged) tx.set(db.doc(COUNTER), { updatedAt: now }, { merge: true });
      tx.create(db.collection("auditLog").doc(), {
        at: now,
        action: "employee-updated",
        actor: actor.employeeId,
        target: doc.id,
        employeeNumber,
        changes,
        ...(reinvited ? { reinvited: true } : {}),
      });
    }
    return {
      employee: {
        employeeNumber,
        displayName: input.displayName,
        email: input.email,
        roles: input.roles,
        status: reinvited ? "invited" : String(current.status ?? ""),
      },
      changed,
      reinvited,
      linkedUid,
      rolesChanged: "roles" in changes,
    };
  });

  // Effects outside the transaction (Workforce Auth + this server's cache).
  if (result.linkedUid) {
    if (result.reinvited) await revokeAllSessions(result.linkedUid);
    else forgetEmployee(result.linkedUid); // role changes apply on the next request
  }
  return { employee: result.employee, changed: result.changed, reinvited: result.reinvited };
}

export async function offboardEmployee(
  employeeNumber: string,
  actor: EmployeeMutationActor,
  db: Firestore = workforceDb(),
): Promise<{ employeeNumber: string; displayName: string }> {
  const result = await db.runTransaction(async (tx) => {
    const doc = await employeeByNumber(tx, db, employeeNumber);
    if (doc.get("status") === "offboarded") throw new EmployeeOffboardedError();
    if (doc.id === actor.employeeId) throw new SelfLockoutError("You can't delete your own employee record.");
    const now = FieldValue.serverTimestamp();
    // Status only: the record, its number, authUid link and history are kept.
    tx.update(doc.ref, { status: "offboarded", offboardedAt: now, offboardedBy: actor.employeeId, updatedAt: now, updatedBy: actor.employeeId });
    tx.create(db.collection("auditLog").doc(), {
      at: now,
      action: "employee-offboarded",
      actor: actor.employeeId,
      target: doc.id,
      employeeNumber,
      previousStatus: doc.get("status") ?? null,
    });
    const uid = doc.get("authUid");
    return { employeeNumber, displayName: String(doc.get("displayName") ?? ""), uid: typeof uid === "string" && uid ? uid : null };
  });
  if (result.uid) {
    // Live session cookies are verified with checkRevoked: this ends them now.
    await revokeAllSessions(result.uid);
  }
  return { employeeNumber: result.employeeNumber, displayName: result.displayName };
}
