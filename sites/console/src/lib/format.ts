const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const integer = new Intl.NumberFormat("en-IN");

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" });

export const EMPTY = "—";

export function formatCurrency(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? EMPTY : inr.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? EMPTY : integer.format(value);
}

export function formatPercent(value: number | null | undefined, suffix = ""): string {
  return value == null || Number.isNaN(value) ? EMPTY : `${integer.format(value)}%${suffix}`;
}

export function formatDate(value: Date | null | undefined): string {
  return value ? dateFormat.format(value) : EMPTY;
}

export function formatDateTime(value: Date | null | undefined): string {
  return value ? dateTimeFormat.format(value) : EMPTY;
}

/** Formats an SHG period label ("YYYY-MM") as "Mar 2026". */
export function formatPeriod(period: string | null | undefined): string {
  const match = period?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return period || EMPTY;
  return monthFormat.format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

/** Shows only the last four digits of a phone number. */
export function maskPhone(phone: string | null | undefined): string {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : EMPTY;
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "") || "?";
}
