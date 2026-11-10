/**
 * External partner input: shape, normalisation and validation.
 * Partners are not employees — no roles, no Workforce Auth, no EMP-IDs.
 */

export const PARTNER_TYPES = ["digital_sakhi", "digital_sarathi"] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const PARTNER_STATUSES = ["active", "inactive", "terminated"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  digital_sakhi: "Digital Sakhi",
  digital_sarathi: "Digital Sarathi",
};

export const PARTNER_STATUS_LABEL: Record<PartnerStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  terminated: "Terminated",
};

export const PARTNER_CODE_PREFIX: Record<PartnerType, "OZEY-DS" | "OZEY-DST"> = {
  digital_sakhi: "OZEY-DS",
  digital_sarathi: "OZEY-DST",
};

export const COMMISSION_POLICY_V1 = {
  version: "v1",
  newOnboardingRate: 0.5,
  renewalRate: 0.25,
  newOnboardingLabel: "50% on the first successful paid subscription",
  renewalLabel: "25% on every subsequent successful renewal",
} as const;

export const PARTNER_ADDRESS_FIELDS = [
  { key: "doorNo", label: "Door / House No." },
  { key: "street", label: "Street / Address Line" },
  { key: "locality", label: "Area / Locality" },
  { key: "city", label: "City / Town" },
  { key: "postalCode", label: "PIN / Postal Code" },
] as const;

export type PartnerAddressKey = (typeof PARTNER_ADDRESS_FIELDS)[number]["key"];
export type PartnerAddress = Partial<Record<PartnerAddressKey, string>>;

export interface PartnerTerritory {
  state?: string;
  district?: string;
  mandal?: string;
  village?: string;
}

export interface NewPartnerInput {
  firstName: string;
  secondName?: string;
  lastName: string;
  mobile: string;
  email?: string;
  partnerType: PartnerType;
  address?: PartnerAddress;
  territory?: PartnerTerritory;
  joinedAt?: string;
}

export interface NewPartner {
  firstName: string;
  secondName: string | null;
  lastName: string;
  displayName: string;
  mobile: string;
  email: string | null;
  partnerType: PartnerType;
  address: PartnerAddress;
  territory: PartnerTerritory;
  joinedAt: string | null;
}

export type PartnerFieldErrors = Partial<
  Record<
    | "firstName"
    | "secondName"
    | "lastName"
    | "mobile"
    | "email"
    | "partnerType"
    | "joinedAt"
    | "state"
    | "district"
    | "mandal"
    | "village"
    | PartnerAddressKey,
    string
  >
>;

const MAX_NAME = 80;
const MAX_TEXT = 120;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^\s@]+$/;
const CONTROL = /[\u0000-\u001f\u007f]/;
/** India mobile: optional +91 / 0, then 10 digits starting 6–9. */
const MOBILE = /^(?:\+?91[\s-]?)?0?([6-9]\d{9})$/;

const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

export function isPartnerType(value: unknown): value is PartnerType {
  return typeof value === "string" && (PARTNER_TYPES as readonly string[]).includes(value);
}

export function isPartnerStatus(value: unknown): value is PartnerStatus {
  return typeof value === "string" && (PARTNER_STATUSES as readonly string[]).includes(value);
}

export function formatPartnerNumber(type: PartnerType, sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new RangeError("Partner sequence must be a positive integer");
  return `${PARTNER_CODE_PREFIX[type]}-${String(sequence).padStart(4, "0")}`;
}

function checkText(value: string, label: string, max: number, required: boolean): string | undefined {
  if (!value) return required ? `${label} is required.` : undefined;
  if (value.length > max) return `${label} must be at most ${max} characters.`;
  if (CONTROL.test(value)) return `${label} contains characters that are not allowed.`;
  return undefined;
}

export function normaliseMobile(raw: unknown): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  const m = MOBILE.exec(value.replace(/[\s-]/g, ""));
  return m ? m[1] : null;
}

export function validateNewPartner(raw: unknown): { ok: true; value: NewPartner } | { ok: false; errors: PartnerFieldErrors } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: PartnerFieldErrors = {};

  const firstName = clean(input.firstName);
  const secondName = clean(input.secondName);
  const lastName = clean(input.lastName);
  const emailRaw = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const mobile = normaliseMobile(input.mobile);

  for (const [k, v] of Object.entries({
    firstName: checkText(firstName, "First name", MAX_NAME, true),
    secondName: checkText(secondName, "Second name", MAX_NAME, false),
    lastName: checkText(lastName, "Last name", MAX_NAME, true),
  })) {
    if (v) errors[k as keyof PartnerFieldErrors] = v;
  }

  if (!clean(input.mobile)) errors.mobile = "Mobile number is required.";
  else if (!mobile) errors.mobile = "Enter a valid 10-digit mobile number.";

  if (emailRaw) {
    if (emailRaw.length > 254 || !EMAIL.test(emailRaw)) errors.email = "Enter a valid email address.";
  }

  const partnerTypeRaw = typeof input.partnerType === "string" ? input.partnerType.trim() : "";
  let partnerType: PartnerType | null = null;
  if (!partnerTypeRaw) errors.partnerType = "Select a partner type.";
  else if (!isPartnerType(partnerTypeRaw)) errors.partnerType = "Select Digital Sakhi or Digital Sarathi.";
  else partnerType = partnerTypeRaw;

  if ("partnerNumber" in input && input.partnerNumber != null && input.partnerNumber !== "") {
    errors.partnerType = errors.partnerType ?? "Partner IDs are assigned automatically and cannot be set manually.";
  }
  if ("roles" in input) {
    errors.partnerType = errors.partnerType ?? "Partners do not have Console authorization roles.";
  }

  const rawAddress = (input.address && typeof input.address === "object" ? input.address : {}) as Record<string, unknown>;
  const address: PartnerAddress = {};
  for (const { key, label } of PARTNER_ADDRESS_FIELDS) {
    const value = clean(rawAddress[key]);
    const error = checkText(value, label, MAX_TEXT, false);
    if (error) errors[key] = error;
    else if (value) address[key] = value;
  }

  const rawTerritory = (input.territory && typeof input.territory === "object" ? input.territory : {}) as Record<string, unknown>;
  // Also accept flat territory fields on the root for form convenience.
  const territorySource = {
    state: rawTerritory.state ?? input.state,
    district: rawTerritory.district ?? input.district,
    mandal: rawTerritory.mandal ?? input.mandal,
    village: rawTerritory.village ?? input.village,
  };
  const territory: PartnerTerritory = {};
  for (const key of ["state", "district", "mandal", "village"] as const) {
    const value = clean(territorySource[key]);
    const error = checkText(value, key === "mandal" ? "Mandal / Block" : key[0].toUpperCase() + key.slice(1), MAX_TEXT, false);
    if (error) errors[key] = error;
    else if (value) territory[key] = value;
  }

  let joinedAt: string | null = null;
  const joinedRaw = typeof input.joinedAt === "string" ? input.joinedAt.trim() : "";
  if (joinedRaw) {
    const d = new Date(joinedRaw);
    if (Number.isNaN(d.getTime())) errors.joinedAt = "Enter a valid joining date.";
    else joinedAt = d.toISOString().slice(0, 10);
  }

  if (Object.keys(errors).length > 0 || !partnerType || !mobile) return { ok: false, errors };
  return {
    ok: true,
    value: {
      firstName,
      secondName: secondName || null,
      lastName,
      displayName: [firstName, secondName, lastName].filter(Boolean).join(" "),
      mobile,
      email: emailRaw || null,
      partnerType,
      address,
      territory,
      joinedAt,
    },
  };
}
