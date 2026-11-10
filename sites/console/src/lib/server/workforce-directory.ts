import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import type { EmployeeStatus } from "./employees";
import { workforceDb } from "./workforce-admin";

/**
 * Read-only views of the workforce directory (employees and roles) for the
 * console's administration pages. Callers must check `console:employees.manage`
 * first. Nothing here writes, and Auth linkage (authUid) is never returned.
 */

// The workforce directory is small; a hard cap keeps a bad state from paging the whole collection.
const MAX_ROWS = 500;

/**
 * What the Employees page receives. Deliberately carries no document id,
 * Auth uid or author ids: the email (unique, the sign-in key) identifies a row.
 */
export interface DirectoryEmployee {
  /** Human-readable "EMP-0001"; null for records created before numbering. */
  employeeNumber: string | null;
  email: string;
  displayName: string;
  status: EmployeeStatus;
  roles: string[];
  linked: boolean;
  lastSignInAt: string | null;
  createdAt: string | null;
}

export interface DirectoryRole {
  /** The key employees store and authorization reads. */
  id: string;
  /** Human-readable name; display only. Null until set (the Console then shows the id). */
  displayName: string | null;
  product: string | null;
  description: string | null;
  permissions: string[];
  employeeCount: number;
  updatedAt: string | null;
}

const iso = (value: unknown) => ((value as Timestamp | null)?.toDate?.() ?? null)?.toISOString() ?? null;
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

export async function listDirectoryEmployees(): Promise<DirectoryEmployee[]> {
  const snap = await workforceDb().collection("employees").limit(MAX_ROWS).get();
  return snap.docs
    .map((doc) => {
      const d = doc.data();
      return {
        employeeNumber: typeof d.employeeNumber === "string" ? d.employeeNumber : null,
        email: String(d.email ?? ""),
        displayName: String(d.displayName ?? d.email ?? ""),
        status: d.status as EmployeeStatus,
        roles: strings(d.roles).sort(),
        linked: Boolean(d.authUid),
        lastSignInAt: iso(d.lastSignInAt),
        createdAt: iso(d.createdAt),
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function listDirectoryRoles(employees: DirectoryEmployee[]): Promise<DirectoryRole[]> {
  const snap = await workforceDb().collection("roles").limit(MAX_ROWS).get();
  return snap.docs
    .map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        displayName: typeof d.displayName === "string" && d.displayName.trim() ? d.displayName.trim() : null,
        product: typeof d.product === "string" ? d.product : null,
        description: typeof d.description === "string" ? d.description : null,
        permissions: strings(d.permissions).sort(),
        // Deleted (offboarded) employees no longer hold a role in practice.
        employeeCount: employees.filter((e) => e.status !== "offboarded" && e.roles.includes(doc.id)).length,
        updatedAt: iso(d.updatedAt),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
