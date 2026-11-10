/**
 * Browser-side client for the console's read-only SHG API (/dashboard/api/shg/*).
 *
 * The browser never talks to ozey-shg and never holds an SHG credential: every
 * call goes to the console server, which checks the Workforce session and
 * shg:read, then reads SHG with a short-lived, read-only server credential.
 */
import { NotFoundError } from "@/lib/errors";
import type {
  GroupFinancials,
  Page,
  PageCursor,
  ShgGroup,
  ShgGroupDetail,
  ShgLoan,
  ShgMeeting,
  ShgMember,
  ShgMemberDetail,
  ShgOverview,
  ShgReport,
  ShgTransaction,
  TransactionKind,
} from "../types";

/** Payment record kinds (money received). Loan disbursements are not payments. */
export const TRANSACTION_KINDS: TransactionKind[] = ["saving", "repayment", "opening-repayment", "monthly-charge"];
export type LoanStatusFilter = "pending" | "active" | "overdue" | "repaid";

/** Error carrying a code that lib/errors classifies (401/403/503 …). */
export class ShgApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`SHG request failed (${status} ${code})`);
    this.name = "ShgApiError";
  }
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const reviveDates = (_key: string, value: unknown) =>
  typeof value === "string" && ISO_INSTANT.test(value) ? new Date(value) : value;

const STATUS_CODES: Record<number, string> = {
  400: "invalid-argument",
  401: "unauthenticated",
  403: "permission-denied",
  503: "unavailable",
};

async function shgGet<T>(path: string, params: Record<string, string | null | undefined> = {}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const qs = query.toString();
  const res = await fetch(`/dashboard/api/shg/${path}${qs ? `?${qs}` : ""}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) throw new NotFoundError("Record");
  if (!res.ok) throw new ShgApiError(res.status, STATUS_CODES[res.status] ?? "unknown");
  return JSON.parse(await res.text(), reviveDates) as T;
}

const id = (value: string) => encodeURIComponent(value);

export const getOverview = () => shgGet<ShgOverview>("overview");

export const listGroups = (params: { search?: string; cursor?: PageCursor | null }) =>
  shgGet<Page<ShgGroup & { financials: GroupFinancials }>>("groups", { q: params.search, cursor: params.cursor });
export const searchGroups = (term: string) => shgGet<ShgGroup[]>("groups/search", { q: term });
export const getGroupNames = (ids: string[]) => shgGet<Record<string, string>>("groups/names", { ids: ids.join(",") });
export const getGroupDetail = (groupId: string) => shgGet<ShgGroupDetail>(`groups/${id(groupId)}`);
export const listGroupRoster = (groupId: string) => shgGet<ShgMember[]>(`groups/${id(groupId)}/roster`);
export const listGroupLoans = (groupId: string) =>
  shgGet<{ loans: ShgLoan[]; totals: GroupFinancials["loans"] }>(`groups/${id(groupId)}/loans`);
export const listGroupMeetings = (groupId: string) => shgGet<ShgMeeting[]>(`groups/${id(groupId)}/meetings`);

export const listMembers = (params: { groupId?: string | null; search?: string; cursor?: PageCursor | null }) =>
  shgGet<Page<ShgMember>>("members", { group: params.groupId, q: params.search, cursor: params.cursor });
export const getMemberDetail = (groupId: string, memberId: string) => shgGet<ShgMemberDetail>(`members/${id(groupId)}/${id(memberId)}`);

export interface TransactionFilters {
  kinds?: TransactionKind[];
  groupId?: string | null;
  memberId?: string | null;
  /** Inclusive calendar days, YYYY-MM-DD (IST). */
  from?: string | null;
  to?: string | null;
}
export const listTransactions = (filters: TransactionFilters, cursor?: PageCursor | null) =>
  shgGet<Page<ShgTransaction>>("transactions", {
    type: filters.kinds?.length === 1 ? filters.kinds[0] : null,
    group: filters.groupId,
    member: filters.memberId,
    from: filters.from,
    to: filters.to,
    cursor,
  });

export const listLoans = (params: { groupId?: string | null; status?: LoanStatusFilter | null; cursor?: PageCursor | null }) =>
  shgGet<Page<ShgLoan>>("loans", { group: params.groupId, status: params.status, cursor: params.cursor });

export const listMeetings = (params: { groupId?: string | null; cursor?: PageCursor | null }) =>
  shgGet<Page<ShgMeeting>>("meetings", { group: params.groupId, cursor: params.cursor });

export const getReport = (groupId: string, year: number) =>
  shgGet<ShgReport & { truncated: boolean }>("reports", { group: groupId, year: String(year) });
