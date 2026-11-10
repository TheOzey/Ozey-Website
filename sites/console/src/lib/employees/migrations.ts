/**
 * One-time Workforce data migrations, as pure planning functions (no I/O), so
 * every rule is unit-tested. scripts/workforce-migrate.ts reads the data,
 * calls these, and applies the plan inside one Firestore transaction.
 *
 * Both plans are idempotent: run against already-migrated data they return
 * nothing to do. Neither ever overwrites a value that is already present.
 */
import { formatEmployeeNumber } from "./new-employee.ts";

const EMPLOYEE_NUMBER = /^EMP-(\d{4,})$/;

/** 42 for "EMP-0042"; null for anything that is not a well-formed number. */
export function parseEmployeeNumber(value: unknown): number | null {
  const m = typeof value === "string" ? EMPLOYEE_NUMBER.exec(value) : null;
  return m ? Number(m[1]) : null;
}

export interface EmployeeForNumbering {
  /** Document id (emp_<random>): never changed, only used to target the update. */
  id: string;
  employeeNumber: unknown;
  createdAt: Date | null;
}

export interface NumberingPlan {
  /** Employees without a number, oldest first, with the number each would get. */
  assignments: { id: string; employeeNumber: string }[];
  /** counters/employees.next after the plan is applied. */
  nextCounter: number;
  /** Records whose employeeNumber is present but malformed: reported, never touched. */
  malformed: string[];
}

/**
 * Numbers for every employee without one. Numbering continues from whichever
 * is higher, the counter or the highest number already issued, so a number is
 * never issued twice even if the counter were behind. Order: createdAt, then
 * document id (stable, so a dry run and the applied run agree).
 */
export function planEmployeeNumbers(employees: readonly EmployeeForNumbering[], counterNext: unknown): NumberingPlan {
  const issued = employees.map((e) => parseEmployeeNumber(e.employeeNumber)).filter((n): n is number => n !== null);
  const counter = typeof counterNext === "number" && Number.isSafeInteger(counterNext) && counterNext > 0 ? counterNext : 1;
  let next = Math.max(counter, issued.length ? Math.max(...issued) + 1 : 1);

  const missing = employees
    .filter((e) => e.employeeNumber === undefined || e.employeeNumber === null || e.employeeNumber === "")
    .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const assignments = missing.map((e) => ({ id: e.id, employeeNumber: formatEmployeeNumber(next++) }));
  const malformed = employees.filter((e) => !missing.includes(e) && parseEmployeeNumber(e.employeeNumber) === null).map((e) => e.id);
  return { assignments, nextCounter: next, malformed };
}

/**
 * Human-readable names for the roles that exist today. The role id stays the
 * key that employees store and authorization reads; the name is display only.
 */
export const ROLE_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  "console-admin": "Console Administrator",
  "shg-viewer": "SHG Viewer",
};

/** Roles that get a display name: known ids whose displayName is absent or blank. */
export function planRoleDisplayNames(roles: readonly { id: string; displayName: unknown }[]) {
  const set: { id: string; displayName: string }[] = [];
  const unnamed: string[] = [];
  for (const role of roles) {
    if (typeof role.displayName === "string" && role.displayName.trim()) continue;
    const name = ROLE_DISPLAY_NAMES[role.id];
    if (name) set.push({ id: role.id, displayName: name });
    else unnamed.push(role.id);
  }
  return { set, unnamed };
}

/** What the Console shows for a role: its display name, else its id. */
export const roleLabel = (role: { id: string; displayName?: string | null }) => role.displayName?.trim() || role.id;
