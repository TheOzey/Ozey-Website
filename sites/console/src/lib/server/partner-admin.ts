import "server-only";
import { randomBytes } from "node:crypto";
import { FieldValue, type Firestore, Timestamp } from "firebase-admin/firestore";
import {
  isPartnerStatus,
  isPartnerType,
  type NewPartner,
  type PartnerStatus,
  type PartnerType,
} from "@/lib/partners/model";
import { PARTNERS_MANAGE, hasPermission } from "@/lib/permissions/permissions";
import { issuePartnerNumber, retirePartnerNumber } from "./partner-codes";
import { workforceDb } from "./workforce-admin";

export class PartnerNotFoundError extends Error {
  constructor() {
    super("Partner not found");
    this.name = "PartnerNotFoundError";
  }
}

export class PartnerTerminatedError extends Error {
  constructor() {
    super("Partner has been terminated");
    this.name = "PartnerTerminatedError";
  }
}

export class PartnerPermissionError extends Error {
  constructor(message = "Partner changes require console:partners.manage") {
    super(message);
    this.name = "PartnerPermissionError";
  }
}

export class DuplicatePartnerMobileError extends Error {
  constructor() {
    super("A partner with this mobile number already exists");
    this.name = "DuplicatePartnerMobileError";
  }
}

type Actor = { employeeId: string; permissions: readonly string[] };

function assertCanManage(actor: Actor) {
  if (!hasPermission(actor.permissions, PARTNERS_MANAGE)) throw new PartnerPermissionError();
}

const iso = (value: unknown) => ((value as Timestamp | null)?.toDate?.() ?? null)?.toISOString() ?? null;

export interface CreatedPartner {
  partnerNumber: string;
  displayName: string;
  partnerType: PartnerType;
  mobile: string;
  status: "active";
}

export interface PartnerRecord {
  partnerNumber: string;
  partnerType: PartnerType;
  firstName: string;
  secondName: string;
  lastName: string;
  displayName: string;
  mobile: string;
  email: string | null;
  address: Record<string, string>;
  territory: { state?: string; district?: string; mandal?: string; village?: string };
  status: PartnerStatus;
  joinedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

async function partnerByNumber(tx: import("firebase-admin/firestore").Transaction | null, db: Firestore, partnerNumber: string) {
  const query = db.collection("partners").where("partnerNumber", "==", partnerNumber).limit(2);
  const snap = tx ? await tx.get(query) : await query.get();
  if (snap.size !== 1) throw new PartnerNotFoundError();
  return snap.docs[0];
}

export async function createPartner(input: NewPartner, actor: Actor, db: Firestore = workforceDb()): Promise<CreatedPartner> {
  assertCanManage(actor);
  const partnerDocId = `ptr_${randomBytes(9).toString("base64url")}`;
  const partnerRef = db.collection("partners").doc(partnerDocId);

  return db.runTransaction(async (tx) => {
    const sameMobile = await tx.get(db.collection("partners").where("mobile", "==", input.mobile).limit(1));
    if (!sameMobile.empty) throw new DuplicatePartnerMobileError();

    const partnerNumber = await issuePartnerNumber(tx, db, {
      partnerType: input.partnerType,
      partnerDocId,
      actorId: actor.employeeId,
    });

    const now = FieldValue.serverTimestamp();
    const joinedAt = input.joinedAt ? Timestamp.fromDate(new Date(`${input.joinedAt}T00:00:00.000Z`)) : now;

    tx.create(partnerRef, {
      partnerNumber,
      partnerType: input.partnerType,
      firstName: input.firstName,
      secondName: input.secondName,
      lastName: input.lastName,
      displayName: input.displayName,
      mobile: input.mobile,
      email: input.email,
      address: input.address,
      territory: input.territory,
      status: "active" satisfies PartnerStatus,
      joinedAt,
      createdAt: now,
      createdBy: actor.employeeId,
      updatedAt: now,
      updatedBy: actor.employeeId,
    });

    tx.create(db.collection("partnerAuditLog").doc(), {
      at: now,
      action: "partner-created",
      actor: actor.employeeId,
      target: partnerDocId,
      partnerNumber,
      partnerType: input.partnerType,
    });

    return {
      partnerNumber,
      displayName: input.displayName,
      partnerType: input.partnerType,
      mobile: input.mobile,
      status: "active" as const,
    };
  });
}

export async function getPartner(partnerNumber: string, db: Firestore = workforceDb()): Promise<PartnerRecord> {
  const d = await partnerByNumber(null, db, partnerNumber);
  const data = d.data();
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const address = data.address && typeof data.address === "object" ? data.address : {};
  const territory = data.territory && typeof data.territory === "object" ? data.territory : {};
  const partnerType = isPartnerType(data.partnerType) ? data.partnerType : "digital_sakhi";
  const status = isPartnerStatus(data.status) ? data.status : "active";
  return {
    partnerNumber,
    partnerType,
    firstName: str(data.firstName),
    secondName: str(data.secondName),
    lastName: str(data.lastName),
    displayName: str(data.displayName) || [str(data.firstName), str(data.secondName), str(data.lastName)].filter(Boolean).join(" "),
    mobile: str(data.mobile),
    email: typeof data.email === "string" && data.email ? data.email : null,
    address: Object.fromEntries(Object.entries(address as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string")),
    territory: Object.fromEntries(
      Object.entries(territory as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string"),
    ) as PartnerRecord["territory"],
    status,
    joinedAt: iso(data.joinedAt)?.slice(0, 10) ?? null,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  };
}

export async function updatePartner(
  partnerNumber: string,
  input: NewPartner,
  actor: Actor,
  db: Firestore = workforceDb(),
): Promise<{ partner: Omit<CreatedPartner, "status"> & { status: PartnerStatus }; changed: string[] }> {
  assertCanManage(actor);
  return db.runTransaction(async (tx) => {
    const doc = await partnerByNumber(tx, db, partnerNumber);
    const current = doc.data();
    if (current.status === "terminated") throw new PartnerTerminatedError();

    if (current.mobile !== input.mobile) {
      const sameMobile = await tx.get(db.collection("partners").where("mobile", "==", input.mobile).limit(1));
      if (!sameMobile.empty && sameMobile.docs[0].id !== doc.id) throw new DuplicatePartnerMobileError();
    }

    const previousType = isPartnerType(current.partnerType) ? current.partnerType : null;
    // Category change is audited and does NOT reissue Partner ID.
    const typeChanged = previousType !== null && previousType !== input.partnerType;

    const next = {
      firstName: input.firstName,
      secondName: input.secondName,
      lastName: input.lastName,
      displayName: input.displayName,
      mobile: input.mobile,
      email: input.email,
      partnerType: input.partnerType,
      address: input.address,
      territory: input.territory,
      joinedAt: input.joinedAt ? Timestamp.fromDate(new Date(`${input.joinedAt}T00:00:00.000Z`)) : current.joinedAt ?? null,
    };

    const before: Record<string, unknown> = {
      firstName: current.firstName ?? null,
      secondName: current.secondName ?? null,
      lastName: current.lastName ?? null,
      displayName: current.displayName ?? null,
      mobile: current.mobile ?? null,
      email: current.email ?? null,
      partnerType: previousType,
      address: current.address ?? {},
      territory: current.territory ?? {},
      joinedAt: iso(current.joinedAt)?.slice(0, 10) ?? null,
    };
    const comparable = {
      ...next,
      joinedAt: input.joinedAt,
    };
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, value] of Object.entries(comparable)) {
      if (JSON.stringify(before[key] ?? null) !== JSON.stringify(value)) changes[key] = { from: before[key], to: value };
    }
    const changed = Object.keys(changes);
    if (changed.length > 0) {
      const now = FieldValue.serverTimestamp();
      tx.update(doc.ref, { ...next, updatedAt: now, updatedBy: actor.employeeId });
      tx.create(db.collection("partnerAuditLog").doc(), {
        at: now,
        action: "partner-updated",
        actor: actor.employeeId,
        target: doc.id,
        partnerNumber,
        changes,
      });
      if (typeChanged) {
        tx.create(db.collection("partnerAuditLog").doc(), {
          at: now,
          action: "partner-type-changed-id-preserved",
          actor: actor.employeeId,
          target: doc.id,
          partnerNumber,
          fromType: previousType,
          toType: input.partnerType,
        });
      }
    }

    return {
      partner: {
        partnerNumber,
        displayName: input.displayName,
        partnerType: input.partnerType,
        mobile: input.mobile,
        status: (isPartnerStatus(current.status) ? current.status : "active") as PartnerStatus,
      },
      changed,
    };
  });
}

/** Soft-end a partner: inactive or terminated. Partner ID is retired and never reused. */
export async function setPartnerStatus(
  partnerNumber: string,
  status: Exclude<PartnerStatus, "active">,
  actor: Actor,
  db: Firestore = workforceDb(),
): Promise<{ partnerNumber: string; status: PartnerStatus }> {
  assertCanManage(actor);
  return db.runTransaction(async (tx) => {
    const doc = await partnerByNumber(tx, db, partnerNumber);
    const current = doc.data();
    if (current.status === "terminated") throw new PartnerTerminatedError();
    const now = FieldValue.serverTimestamp();
    const previous = current.status ?? null;
    tx.update(doc.ref, {
      status,
      updatedAt: now,
      updatedBy: actor.employeeId,
      ...(status === "terminated" ? { terminatedAt: now, terminatedBy: actor.employeeId } : { inactivatedAt: now, inactivatedBy: actor.employeeId }),
    });
    if (status === "terminated") {
      await retirePartnerNumber(tx, db, { partnerNumber, actorId: actor.employeeId, reason: "terminated" });
    }
    tx.create(db.collection("partnerAuditLog").doc(), {
      at: now,
      action: status === "terminated" ? "partner-terminated" : "partner-inactivated",
      actor: actor.employeeId,
      target: doc.id,
      partnerNumber,
      previousStatus: previous,
    });
    return { partnerNumber, status };
  });
}

export async function listPartners(db: Firestore = workforceDb()): Promise<PartnerRecord[]> {
  const snap = await db.collection("partners").limit(500).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      const str = (v: unknown) => (typeof v === "string" ? v : "");
      const address = data.address && typeof data.address === "object" ? data.address : {};
      const territory = data.territory && typeof data.territory === "object" ? data.territory : {};
      return {
        partnerNumber: str(data.partnerNumber),
        partnerType: (isPartnerType(data.partnerType) ? data.partnerType : "digital_sakhi") as PartnerType,
        firstName: str(data.firstName),
        secondName: str(data.secondName),
        lastName: str(data.lastName),
        displayName: str(data.displayName) || [str(data.firstName), str(data.secondName), str(data.lastName)].filter(Boolean).join(" "),
        mobile: str(data.mobile),
        email: typeof data.email === "string" && data.email ? data.email : null,
        address: Object.fromEntries(Object.entries(address as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string")),
        territory: Object.fromEntries(
          Object.entries(territory as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string"),
        ) as PartnerRecord["territory"],
        status: (isPartnerStatus(data.status) ? data.status : "active") as PartnerStatus,
        joinedAt: iso(data.joinedAt)?.slice(0, 10) ?? null,
        createdAt: iso(data.createdAt),
        updatedAt: iso(data.updatedAt),
      };
    })
    .filter((p) => p.partnerNumber)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
