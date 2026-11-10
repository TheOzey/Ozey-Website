import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import type { Permission } from "@/lib/permissions/permissions";
import { workforceDb } from "./workforce-admin";

export type EmployeeStatus = "invited" | "active" | "suspended" | "offboarded";

export interface Employee {
  id: string;
  email: string;
  displayName: string;
  status: EmployeeStatus;
  roles: string[];
  /** Union of the permissions of the employee's roles. Never a wildcard. */
  permissions: Permission[];
}

// Short cache so a page render does not re-read Firestore for every check,
// while role or status changes still take effect within a minute.
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; employee: Employee | null }>();

async function resolvePermissions(roleIds: string[]): Promise<Permission[]> {
  if (roleIds.length === 0) return [];
  const db = workforceDb();
  const snaps = await db.getAll(...roleIds.map((id) => db.doc(`roles/${id}`)));
  const permissions = new Set<Permission>();
  for (const snap of snaps) {
    for (const p of (snap.get("permissions") as unknown[] | undefined) ?? []) {
      // Only well-formed product:capability strings; a "*" can never grant anything.
      if (typeof p === "string" && /^[a-z]+:[a-z.]+$/.test(p)) permissions.add(p as Permission);
    }
  }
  return [...permissions].sort();
}

/** The employee linked to a workforce Auth uid, or null. `fresh` bypasses the cache. */
export async function getEmployeeByAuthUid(uid: string, { fresh = false } = {}): Promise<Employee | null> {
  const hit = cache.get(uid);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.employee;

  const snap = await workforceDb().collection("employees").where("authUid", "==", uid).limit(2).get();
  // Zero or ambiguous links are both treated as "no employee".
  const employee =
    snap.size !== 1
      ? null
      : await (async () => {
          const doc = snap.docs[0];
          const d = doc.data();
          const roles = Array.isArray(d.roles) ? d.roles.filter((r: unknown): r is string => typeof r === "string") : [];
          return {
            id: doc.id,
            email: String(d.email ?? ""),
            displayName: String(d.displayName ?? d.email ?? ""),
            status: d.status as EmployeeStatus,
            roles,
            permissions: await resolvePermissions(roles),
          };
        })();
  cache.set(uid, { at: Date.now(), employee });
  return employee;
}

export function forgetEmployee(uid: string) {
  cache.delete(uid);
}

export async function audit(entry: { action: string; actor: string | null; target?: string | null; [k: string]: unknown }) {
  await workforceDb()
    .collection("auditLog")
    .add({ ...entry, at: FieldValue.serverTimestamp() });
}
