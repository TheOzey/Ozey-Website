import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { EmployeeNotFoundError, getEditableEmployee } from "./employee-admin";
import type { EmployeeStatus } from "./employees";
import { workforceDb } from "./workforce-admin";

const iso = (value: unknown) => ((value as Timestamp | null)?.toDate?.() ?? null)?.toISOString() ?? null;

export interface EmployeeProfile {
  employeeNumber: string;
  displayName: string;
  firstName: string;
  secondName: string;
  lastName: string;
  email: string;
  status: EmployeeStatus | string;
  roles: string[];
  linked: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastSignInAt: string | null;
  address: Record<string, string>;
}

/** Full employee profile for the detail page (no document id or auth uid). */
export async function getEmployeeProfile(employeeNumber: string): Promise<EmployeeProfile> {
  const editable = await getEditableEmployee(employeeNumber);
  const snap = await workforceDb().collection("employees").where("employeeNumber", "==", employeeNumber).limit(2).get();
  if (snap.size !== 1) throw new EmployeeNotFoundError();
  const doc = snap.docs[0];
  const data = doc.data();
  return {
    employeeNumber: editable.employeeNumber,
    displayName: [editable.firstName, editable.secondName, editable.lastName].filter(Boolean).join(" ") || String(data.displayName ?? editable.email),
    firstName: editable.firstName,
    secondName: editable.secondName,
    lastName: editable.lastName,
    email: editable.email,
    status: editable.status,
    roles: editable.roles,
    linked: editable.linked,
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
    lastSignInAt: iso(data.lastSignInAt),
    address: editable.address,
  };
}
