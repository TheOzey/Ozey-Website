/**
 * The "Add employee" input: shape, normalisation and validation. Shared by
 * the browser form (inline errors) and the server API, which re-validates
 * everything and is the only authority — the browser check is a convenience.
 *
 * Workforce schema (OZEY_WORKFORCE_ARCHITECTURE.md §3): `email` is the
 * lowercased Google account email and the sign-in join key; `displayName` is
 * what every existing surface shows; `roles` is an array of role ids. The
 * name parts and the address are additive, optional-by-schema fields.
 * Partners (Digital Sakhi / Sarathi) are a separate entity — not employees.
 */

export const ADDRESS_FIELDS = [
  { key: "doorNo", label: "Door / House No." },
  { key: "street", label: "Street / Address Line" },
  { key: "locality", label: "Area / Locality" },
  { key: "city", label: "City / Town" },
  { key: "district", label: "District" },
  { key: "state", label: "State" },
  { key: "postalCode", label: "PIN / Postal Code" },
] as const;

export type AddressKey = (typeof ADDRESS_FIELDS)[number]["key"];
export type EmployeeAddress = Partial<Record<AddressKey, string>>;

export interface NewEmployeeInput {
  firstName: string;
  secondName?: string;
  lastName: string;
  email: string;
  roles: string[];
  address?: EmployeeAddress;
}

/** The normalised, validated form of a NewEmployeeInput. */
export interface NewEmployee {
  firstName: string;
  secondName: string | null;
  lastName: string;
  displayName: string;
  email: string;
  roles: string[];
  /** Only the address parts that were provided. */
  address: EmployeeAddress;
}

export type FieldErrors = Partial<
  Record<"firstName" | "secondName" | "lastName" | "email" | "roles" | AddressKey, string>
>;

const MAX_NAME = 80;
const MAX_ADDRESS = 120;
// The same check the Workforce seed script applies to employee emails.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ROLE_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;
const POSTAL_CODE = /^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/;
// Control characters are never valid in a name or address.
const CONTROL = /[\u0000-\u001f\u007f]/;

/** Collapses internal whitespace and trims. Non-strings become "". */
const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

export const normaliseEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

function checkText(value: string, label: string, max: number, required: boolean): string | undefined {
  if (!value) return required ? `${label} is required.` : undefined;
  if (value.length > max) return `${label} must be at most ${max} characters.`;
  if (CONTROL.test(value)) return `${label} contains characters that are not allowed.`;
  return undefined;
}

/**
 * Validates and normalises raw input (any JSON). Role ids are checked for
 * shape here; whether each role exists is checked by the server against Roles.
 */
export function validateNewEmployee(raw: unknown): { ok: true; value: NewEmployee } | { ok: false; errors: FieldErrors } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const firstName = clean(input.firstName);
  const secondName = clean(input.secondName);
  const lastName = clean(input.lastName);
  const email = normaliseEmail(input.email);

  const nameErrors = {
    firstName: checkText(firstName, "First name", MAX_NAME, true),
    secondName: checkText(secondName, "Second name", MAX_NAME, false),
    lastName: checkText(lastName, "Last name", MAX_NAME, true),
  };
  for (const [k, v] of Object.entries(nameErrors)) if (v) errors[k as keyof FieldErrors] = v;

  if (!email) errors.email = "Email is required.";
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = "Enter a valid email address.";

  const roles = Array.isArray(input.roles) ? [...new Set(input.roles.filter((r): r is string => typeof r === "string").map((r) => r.trim()))] : [];
  if (roles.length === 0) errors.roles = "Select a role.";
  else if (roles.some((r) => !ROLE_ID.test(r))) errors.roles = "Select a role from the list.";

  const rawAddress = (input.address && typeof input.address === "object" ? input.address : {}) as Record<string, unknown>;
  const address: EmployeeAddress = {};
  for (const { key, label } of ADDRESS_FIELDS) {
    const value = clean(rawAddress[key]);
    const error = checkText(value, label, MAX_ADDRESS, false) ?? (key === "postalCode" && value && !POSTAL_CODE.test(value) ? "Enter a valid PIN / postal code." : undefined);
    if (error) errors[key] = error;
    else if (value) address[key] = value;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      firstName,
      secondName: secondName || null,
      lastName,
      displayName: [firstName, secondName, lastName].filter(Boolean).join(" "),
      email,
      roles: roles.sort(),
      address,
    },
  };
}

/** Human-readable employee number: EMP-0001 … EMP-9999, then EMP-10000 … */
export const formatEmployeeNumber = (n: number) => `EMP-${String(n).padStart(4, "0")}`;
