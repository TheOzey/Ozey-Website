import "server-only";
import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { formatPartnerNumber, type PartnerType } from "@/lib/partners/model";

/**
 * Partner ID issuance for external partners (Workforce Firestore, server only).
 *
 * Counters: `counters/partnerCodes.nextSakhi` / `nextSarathi`
 * Registry: `partnerCodeRegistry/{partnerNumber}` — uniqueness forever, including
 * after inactive/terminated. Never owned by employees.
 */

export const PARTNER_COUNTER = "counters/partnerCodes";
export const PARTNER_REGISTRY = "partnerCodeRegistry";

export type PartnerCodeRegistryStatus = "active" | "retired";

const COUNTER_FIELD: Record<PartnerType, "nextSakhi" | "nextSarathi"> = {
  digital_sakhi: "nextSakhi",
  digital_sarathi: "nextSarathi",
};

export class PartnerCodeConflictError extends Error {
  constructor(message = "Partner ID counter is behind the registry") {
    super(message);
    this.name = "PartnerCodeConflictError";
  }
}

function nextSequence(counter: FirebaseFirestore.DocumentSnapshot, type: PartnerType): number {
  const field = COUNTER_FIELD[type];
  const raw = counter.get(field);
  return Number.isSafeInteger(raw) && (raw as number) > 0 ? (raw as number) : 1;
}

/** Mint a Partner ID inside an open transaction. Does not write the partner doc. */
export async function issuePartnerNumber(
  tx: Transaction,
  db: Firestore,
  input: {
    partnerType: PartnerType;
    partnerDocId: string;
    actorId: string;
  },
): Promise<string> {
  const counterRef = db.doc(PARTNER_COUNTER);
  const counter = await tx.get(counterRef);
  const sequence = nextSequence(counter, input.partnerType);
  const partnerNumber = formatPartnerNumber(input.partnerType, sequence);
  const registryRef = db.collection(PARTNER_REGISTRY).doc(partnerNumber);
  const existing = await tx.get(registryRef);
  if (existing.exists) throw new PartnerCodeConflictError();

  const now = FieldValue.serverTimestamp();
  tx.set(counterRef, { [COUNTER_FIELD[input.partnerType]]: sequence + 1, updatedAt: now }, { merge: true });
  tx.create(registryRef, {
    partnerNumber,
    partnerId: input.partnerDocId,
    partnerType: input.partnerType,
    status: "active" satisfies PartnerCodeRegistryStatus,
    createdAt: now,
    createdBy: input.actorId,
    retiredAt: null,
    retiredBy: null,
  });
  return partnerNumber;
}

/** Retire a Partner ID in the registry. The ID string is never deleted or reused. */
export async function retirePartnerNumber(
  tx: Transaction,
  db: Firestore,
  input: { partnerNumber: string; actorId: string; reason: string },
): Promise<void> {
  const registryRef = db.collection(PARTNER_REGISTRY).doc(input.partnerNumber);
  const existing = await tx.get(registryRef);
  if (!existing.exists) return;
  if (existing.get("status") === "retired") return;
  const now = FieldValue.serverTimestamp();
  tx.update(registryRef, {
    status: "retired" satisfies PartnerCodeRegistryStatus,
    retiredAt: now,
    retiredBy: input.actorId,
    retireReason: input.reason,
  });
}
