/**
 * Read-only SHG queries over the existing ozey-shg Firestore data
 * (origin/main schema). Every call receives a Firestore client authenticated
 * as the SHG read identity; nothing here can write.
 *
 * Index policy: ozey-shg has no composite or collection-group indexes, and
 * adding some would be a cloud change. So every query here uses only indexes
 * Firestore creates automatically: single-field orderings/ranges inside ONE
 * group's subcollection, equality filters, and per-group aggregations.
 * Cross-group views fan out per group and merge on the server, bounded by
 * LIMITS.maxGroups. Exceeding a bound raises ShgScaleLimitError rather than
 * silently truncating.
 */
import { AggregateField, type DocumentData, type Firestore, type Query, type QueryDocumentSnapshot, Timestamp } from "@google-cloud/firestore";
import { compareRuleVersions } from "../../../../modules/shg/domain/rules.ts";
import {
  DAY_MS,
  groupFinancials,
  istPeriod,
  memberAccount,
  type OpeningRepaymentRecord,
  openingLoanRows,
  paidByLoan,
  type RepaymentRecord,
  sumFinancials,
  withPrincipalOutstanding,
} from "../../../../modules/shg/domain/financials.ts";
import { buildReport, istDayStart, istYearRange } from "../../../../modules/shg/domain/reports.ts";
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
  ShgOpeningBalance,
  ShgOpeningMemberMaps,
  ShgOverview,
  ShgReport,
  ShgRuleVersion,
  ShgTransaction,
  TransactionKind,
} from "../../../../modules/shg/types/index.ts";
import { type CursorState, decodeCursor, encodeCursor, InvalidCursorError } from "./cursor.ts";
import {
  disbursementToTransaction,
  groupIdOf,
  LOAN_STATUS_INDEX,
  monthlyChargeToTransaction,
  openingRepaymentToTransaction,
  repaymentToTransaction,
  savingToTransaction,
  toGroup,
  toLoan,
  toMeeting,
  toMember,
  toMonthlyClosure,
  toOpeningBalance,
  toOpeningMemberMaps,
  toRuleVersion,
} from "./mappers.ts";

export const LIMITS = {
  pageSize: 25,
  /** Groups a cross-group view may fan out over. */
  maxGroups: 200,
  roster: 500,
  loansPerGroup: 1000,
  memberHistoryPerKind: 1000,
  /** Repayment / opening-repayment records read per group for loan balances. */
  recordsPerGroup: 10000,
  reportRecordsPerKind: 10000,
  groupSearch: 10,
  groupNames: 100,
} as const;

export class ShgScaleLimitError extends Error {
  constructor(what: string) {
    super(`SHG data exceeds the console's ${what} limit`);
    this.name = "ShgScaleLimitError";
  }
}

export class ShgNotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "ShgNotFoundError";
  }
}

const VALID_ID = /^[A-Za-z0-9_.~-]{1,200}$/;
export function assertId(id: string, what: string): string {
  // Firestore IDs from the app are opaque; reject anything that could change the path.
  if (!VALID_ID.test(id) || id.startsWith("__")) throw new ShgNotFoundError(what);
  return id;
}

const asCursor = (raw: string): PageCursor => raw as PageCursor;
const groupPath = (groupId: string) => `groups/${groupId}`;

// ── Groups ────────────────────────────────────────────────────────────────────

/** Every group id and name the cross-group views fan out over. */
export async function listAllGroups(db: Firestore): Promise<{ id: string; name: string; village: string; createdAt: Date | null }[]> {
  const snap = await db
    .collection("groups")
    .orderBy("groupName")
    .select("groupName", "villageName", "createdAt")
    .limit(LIMITS.maxGroups + 1)
    .get();
  if (snap.size > LIMITS.maxGroups) throw new ShgScaleLimitError("group fan-out");
  return snap.docs.map((d) => {
    const g = toGroup(d);
    return { id: d.id, name: g.name, village: g.village, createdAt: g.createdAt };
  });
}

function prefixRange(query: Query, field: string, prefix: string): Query {
  return query.where(field, ">=", prefix).where(field, "<=", `${prefix}`);
}

export async function listGroups(db: Firestore, params: { search?: string; cursor?: string | null }) {
  const term = params.search?.trim();
  const base = term ? prefixRange(db.collection("groups"), "groupName", term) : db.collection("groups");
  const page = await mergedPage(db, {
    sources: [{ key: "groups", collectionPath: "groups/", query: base.orderBy("groupName"), map: toGroup, sortValue: (g: ShgGroup) => g.name }],
    cursor: params.cursor,
    direction: "asc",
  });
  const now = new Date();
  const financials = await Promise.all(page.items.map((g) => getGroupFinancials(db, g.id, now)));
  return { items: page.items.map((group, i) => ({ ...group, financials: financials[i] })), next: page.next };
}

export async function searchGroups(db: Firestore, prefix: string): Promise<ShgGroup[]> {
  const term = prefix.trim();
  const base = term ? prefixRange(db.collection("groups"), "groupName", term) : db.collection("groups");
  const snap = await base.orderBy("groupName").limit(LIMITS.groupSearch).get();
  return snap.docs.map(toGroup);
}

export async function getGroupNames(db: Firestore, ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids)].filter((id) => VALID_ID.test(id) && !id.startsWith("__")).slice(0, LIMITS.groupNames);
  if (unique.length === 0) return {};
  const snaps = await db.getAll(...unique.map((id) => db.doc(groupPath(id))), { fieldMask: ["groupName"] });
  return Object.fromEntries(snaps.filter((s) => s.exists).map((s) => [s.id, toGroup(s).name]));
}

// ── Group financials (source of truth: the records, with the app's formulas) ──

/** Bounded read: more than `max` documents raises rather than silently dropping records. */
async function boundedGet(query: Query, max: number, what: string) {
  const snap = await query.limit(max + 1).get();
  if (snap.size > max) throw new ShgScaleLimitError(what);
  return snap.docs;
}

async function readOpening(db: Firestore, groupId: string): Promise<{ balance: ShgOpeningBalance | null; maps: ShgOpeningMemberMaps }> {
  const snap = await db.doc(`${groupPath(groupId)}/openingBalance/current`).get();
  return { balance: toOpeningBalance(snap), maps: toOpeningMemberMaps(snap) };
}

const toOpeningRepaymentRecord = (d: QueryDocumentSnapshot): OpeningRepaymentRecord => ({
  memberId: String(d.get("memberId") ?? ""),
  // OpeningRepaymentDto.fromMap defaults the kind to "loan".
  kind: typeof d.get("kind") === "string" && d.get("kind") ? String(d.get("kind")) : "loan",
  amount: Number(d.get("amount")) || 0,
});

async function openingRepaymentsOf(db: Firestore, groupId: string, memberId?: string): Promise<OpeningRepaymentRecord[]> {
  let query: Query = db.collection(`${groupPath(groupId)}/openingRepayments`);
  if (memberId) query = query.where("memberId", "==", memberId);
  const docs = await boundedGet(query.select("memberId", "kind", "amount"), LIMITS.recordsPerGroup, "opening-repayments-per-group");
  return docs.map(toOpeningRepaymentRecord);
}

async function repaymentsOf(db: Firestore, groupId: string, memberId?: string): Promise<RepaymentRecord[]> {
  let query: Query = db.collection(`${groupPath(groupId)}/repayments`);
  if (memberId) query = query.where("memberId", "==", memberId);
  const docs = await boundedGet(query.select("loanId", "amount"), LIMITS.recordsPerGroup, "repayments-per-group");
  return docs.map((d) => ({ loanId: String(d.get("loanId") ?? ""), amount: Number(d.get("amount")) || 0 }));
}

async function memberNamesOf(db: Firestore, groupId: string): Promise<Record<string, string>> {
  const docs = await boundedGet(db.collection(`${groupPath(groupId)}/members`).select("name"), LIMITS.roster, "roster");
  return Object.fromEntries(docs.map((d) => [d.id, toMember(d).name]));
}

/**
 * Savings buckets for a group, reversals included. ozey-shg has no composite
 * indexes, and a sum() filtered on another field (period, date) would need one,
 * so: one unfiltered sum() aggregation for the total, plus single-field range
 * reads (automatic indexes) for the two small buckets — advances (period after
 * the current month) and the last 30 days.
 */
async function savingsBuckets(db: Firestore, groupId: string, now: Date) {
  const savings = db.collection(`${groupPath(groupId)}/savings`);
  const [all, advance, last30] = await Promise.all([
    savings.aggregate({ total: AggregateField.sum("amount") }).get(),
    boundedGet(savings.where("period", ">", istPeriod(now)).select("amount"), LIMITS.recordsPerGroup, "savings-per-group"),
    boundedGet(
      savings.where("date", ">=", Timestamp.fromDate(new Date(now.getTime() - 30 * DAY_MS))).select("amount"),
      LIMITS.recordsPerGroup,
      "savings-per-group",
    ),
  ]);
  const amount = (docs: QueryDocumentSnapshot[]) => docs.reduce((s, d) => s + (Number(d.get("amount")) || 0), 0);
  const total = all.data().total ?? 0;
  const afterCurrentPeriod = amount(advance);
  return { upToCurrentPeriod: total - afterCurrentPeriod, afterCurrentPeriod, last30Days: amount(last30) };
}

/**
 * A group's financial position from its records: members, savings (opening +
 * recorded up to the current IST month), loans (opening + recorded, principal
 * outstanding via the app's waterfall). See GroupFinancials for each definition.
 */
export async function getGroupFinancials(db: Firestore, groupId: string, now: Date = new Date()): Promise<GroupFinancials> {
  assertId(groupId, "Group");
  const [memberDocs, savings, loans, repayments, opening, openingRepayments] = await Promise.all([
    boundedGet(db.collection(`${groupPath(groupId)}/members`).select("statusIndex", "joinedAt"), LIMITS.roster, "roster"),
    savingsBuckets(db, groupId, now),
    loansOfGroup(db, groupId),
    repaymentsOf(db, groupId),
    readOpening(db, groupId),
    openingRepaymentsOf(db, groupId),
  ]);
  return groupFinancials({
    now,
    members: memberDocs.map((d) => {
      const m = toMember(d);
      return { status: m.status, joinedAt: m.joinedAt };
    }),
    savings,
    loans: withPrincipalOutstanding(loans, paidByLoan(repayments)),
    opening: opening.balance,
    openingRepayments,
  });
}

export async function getGroupDetail(db: Firestore, groupId: string): Promise<ShgGroupDetail> {
  assertId(groupId, "Group");
  const [groupSnap, financials, opening] = await Promise.all([
    db.doc(groupPath(groupId)).get(),
    getGroupFinancials(db, groupId),
    readOpening(db, groupId),
  ]);
  if (!groupSnap.exists) throw new ShgNotFoundError("Group");
  return { group: toGroup(groupSnap), financials, openingBalance: opening.balance };
}

export async function listGroupRoster(db: Firestore, groupId: string): Promise<ShgMember[]> {
  assertId(groupId, "Group");
  const snap = await db.collection(`${groupPath(groupId)}/members`).orderBy("name").limit(LIMITS.roster).get();
  return snap.docs.map(toMember);
}

export async function listGroupMeetings(db: Firestore, groupId: string, max = 12): Promise<ShgMeeting[]> {
  assertId(groupId, "Group");
  const snap = await db.collection(`${groupPath(groupId)}/meetings`).orderBy("date", "desc").limit(max).get();
  return snap.docs.map(toMeeting);
}

// ── Loans ─────────────────────────────────────────────────────────────────────

async function loansOfGroup(db: Firestore, groupId: string, statuses?: number[], memberId?: string): Promise<ShgLoan[]> {
  let query: Query = db.collection(`${groupPath(groupId)}/loans`);
  // Equality / `in` filters only: no composite index needed. Sorted below.
  if (statuses) query = query.where("statusIndex", "in", statuses);
  if (memberId) query = query.where("memberId", "==", memberId);
  const docs = await boundedGet(query, LIMITS.loansPerGroup, "loans-per-group");
  return docs.map(toLoan).sort(byDateDesc((l) => l.disbursedAt));
}

/**
 * Every loan of a group: recorded `loans` (principal outstanding from their
 * repayment records) and one opening-loan row per member with a pre-app loan.
 * Newest first; opening loans are dated when the opening position was captured.
 */
async function combinedLoansOfGroup(db: Firestore, groupId: string, memberId?: string): Promise<ShgLoan[]> {
  assertId(groupId, "Group");
  if (memberId) assertId(memberId, "Member");
  const [recorded, repayments, opening, openingRepayments, names] = await Promise.all([
    loansOfGroup(db, groupId, undefined, memberId),
    repaymentsOf(db, groupId, memberId),
    readOpening(db, groupId),
    openingRepaymentsOf(db, groupId, memberId),
    memberNamesOf(db, groupId),
  ]);
  const maps = memberId ? onlyMember(opening.maps, memberId) : opening.maps;
  return [
    ...withPrincipalOutstanding(recorded, paidByLoan(repayments)),
    ...openingLoanRows({ groupId, maps, openingRepayments, memberNames: names, asOf: opening.balance?.asOf ?? null }),
  ].sort(byDateDesc((l) => l.disbursedAt));
}

function onlyMember(maps: ShgOpeningMemberMaps, memberId: string): ShgOpeningMemberMaps {
  const pick = (m: Record<string, number>) => (memberId in m ? { [memberId]: m[memberId] } : {});
  return Object.fromEntries(Object.entries(maps).map(([k, m]) => [k, pick(m)])) as unknown as ShgOpeningMemberMaps;
}

export async function listGroupLoans(db: Firestore, groupId: string) {
  assertId(groupId, "Group");
  const [loans, financials] = await Promise.all([combinedLoansOfGroup(db, groupId), getGroupFinancials(db, groupId)]);
  return { loans, totals: financials.loans };
}

export type LoanStatusFilter = keyof typeof LOAN_STATUS_INDEX;

export async function listLoans(
  db: Firestore,
  params: { groupId?: string | null; status?: LoanStatusFilter | null; cursor?: string | null },
): Promise<Page<ShgLoan>> {
  const groupIds = params.groupId ? [assertId(params.groupId, "Group")] : (await listAllGroups(db)).map((g) => g.id);
  const all = (await Promise.all(groupIds.map((g) => combinedLoansOfGroup(db, g)))).flat();
  const filtered = params.status ? all.filter((l) => l.status === params.status) : all;
  filtered.sort(byDateDesc((l) => l.disbursedAt));
  return offsetPage(filtered, params.cursor);
}

// ── Members ───────────────────────────────────────────────────────────────────

export async function listMembers(
  db: Firestore,
  params: { groupId?: string | null; search?: string; cursor?: string | null },
): Promise<Page<ShgMember>> {
  const groupIds = params.groupId ? [assertId(params.groupId, "Group")] : (await listAllGroups(db)).map((g) => g.id);
  const term = params.search?.trim();
  return mergedPage(db, {
    sources: groupIds.map((g) => {
      const col = db.collection(`${groupPath(g)}/members`);
      return {
        key: `members|${g}`,
        collectionPath: `${groupPath(g)}/members/`,
        query: (term ? prefixRange(col, "name", term) : col).orderBy("name"),
        map: toMember,
        sortValue: (m: ShgMember) => m.name,
      };
    }),
    cursor: params.cursor,
    direction: "asc",
  });
}

export async function getMember(db: Firestore, groupId: string, memberId: string): Promise<ShgMember> {
  assertId(groupId, "Group");
  assertId(memberId, "Member");
  const snap = await db.doc(`${groupPath(groupId)}/members/${memberId}`).get();
  if (!snap.exists) throw new ShgNotFoundError("Member");
  return toMember(snap);
}

// ── Transactions ──────────────────────────────────────────────────────────────

/** Kinds backed by a record collection (opening-balance entries are derived, not records). */
type RecordKind = Exclude<TransactionKind, "opening-balance">;

const TX_SOURCES: Record<RecordKind, { collection: string; dateField: string; map: (s: QueryDocumentSnapshot) => ShgTransaction }> = {
  saving: { collection: "savings", dateField: "date", map: savingToTransaction },
  repayment: { collection: "repayments", dateField: "date", map: repaymentToTransaction },
  disbursement: { collection: "loans", dateField: "disbursedAt", map: disbursementToTransaction },
  "opening-repayment": { collection: "openingRepayments", dateField: "date", map: openingRepaymentToTransaction },
  "monthly-charge": { collection: "monthlyCharges", dateField: "date", map: monthlyChargeToTransaction },
};
/**
 * Payment records, i.e. money the group received (negative = reversal). A loan
 * disbursement is money paid OUT and is not a payment, so it is not listed
 * among transactions; it appears on Loans, in member history and in reports.
 */
export const TRANSACTION_KINDS: RecordKind[] = ["saving", "repayment", "opening-repayment", "monthly-charge"];

export interface TransactionParams {
  kinds?: TransactionKind[];
  groupId?: string | null;
  /** Member ids are only unique within a group, so this requires `groupId`. */
  memberId?: string | null;
  /** Inclusive IST calendar days, YYYY-MM-DD. */
  from?: string | null;
  to?: string | null;
  cursor?: string | null;
  pageSize?: number;
}

export async function listTransactions(db: Firestore, params: TransactionParams): Promise<Page<ShgTransaction>> {
  const page = await transactionsPage(db, params);
  return { ...page, items: await withMemberNames(db, page.items) };
}

/**
 * Opening repayments do not denormalise the member name: resolve it from the
 * member document (by id within the transaction's own group).
 */
async function withMemberNames(db: Firestore, items: ShgTransaction[]): Promise<ShgTransaction[]> {
  const missing = [...new Set(items.filter((t) => !t.memberName && t.memberId).map((t) => `${t.groupId}/${t.memberId}`))].filter((key) =>
    key.split("/").every((id) => VALID_ID.test(id) && !id.startsWith("__")),
  );
  if (missing.length === 0) return items;
  const snaps = await db.getAll(...missing.map((key) => db.doc(`groups/${key.replace("/", "/members/")}`)), { fieldMask: ["name"] });
  const names = new Map(snaps.filter((s) => s.exists).map((s) => [`${groupIdOf(s)}/${s.id}`, toMember(s).name]));
  return items.map((t) => (t.memberName ? t : { ...t, memberName: names.get(`${t.groupId}/${t.memberId}`) ?? null }));
}

async function transactionsPage(db: Firestore, params: TransactionParams): Promise<Page<ShgTransaction>> {
  const requested = params.kinds?.length ? params.kinds : TRANSACTION_KINDS;
  const kinds = TRANSACTION_KINDS.filter((k) => requested.includes(k));
  const from = params.from ? istDayStart(params.from) : null;
  const toStart = params.to ? istDayStart(params.to) : null;
  const toExclusive = toStart ? new Date(toStart.getTime() + 24 * 60 * 60 * 1000) : null;
  if ((params.from && !from) || (params.to && !toStart)) throw new InvalidCursorError();

  if (params.memberId) {
    if (!params.groupId) throw new ShgNotFoundError("Group");
    const items = (await memberTransactions(db, params.groupId, params.memberId, kinds)).items.filter(
      (t) => (!from || (t.date && t.date >= from)) && (!toExclusive || (t.date && t.date < toExclusive)),
    );
    return offsetPage(items, params.cursor, params.pageSize);
  }

  const groupIds = params.groupId ? [assertId(params.groupId, "Group")] : (await listAllGroups(db)).map((g) => g.id);
  return mergedPage(db, {
    sources: groupIds.flatMap((g) =>
      kinds.map((kind) => {
        const src = TX_SOURCES[kind];
        let query: Query = db.collection(`${groupPath(g)}/${src.collection}`);
        if (from) query = query.where(src.dateField, ">=", Timestamp.fromDate(from));
        if (toExclusive) query = query.where(src.dateField, "<", Timestamp.fromDate(toExclusive));
        return {
          key: `${kind}|${g}`,
          collectionPath: `${groupPath(g)}/${src.collection}/`,
          query: query.orderBy(src.dateField, "desc"),
          map: src.map,
          sortValue: (t: ShgTransaction) => t.date?.getTime() ?? 0,
        };
      }),
    ),
    cursor: params.cursor,
    direction: "desc",
    pageSize: params.pageSize,
  });
}

async function memberTransactions(
  db: Firestore,
  groupId: string,
  memberId: string,
  kinds: RecordKind[] = TRANSACTION_KINDS,
) {
  assertId(groupId, "Group");
  assertId(memberId, "Member");
  const results = await Promise.all(
    kinds.map(async (kind) => {
      const src = TX_SOURCES[kind];
      // Equality filter only (automatic index); sorted below.
      const snap = await db
        .collection(`${groupPath(groupId)}/${src.collection}`)
        .where("memberId", "==", memberId)
        .limit(LIMITS.memberHistoryPerKind)
        .get();
      return { items: snap.docs.map(src.map), truncated: snap.size >= LIMITS.memberHistoryPerKind };
    }),
  );
  return {
    items: results.flatMap((r) => r.items).sort(byDateDesc((t) => t.date)),
    truncated: results.some((r) => r.truncated),
  };
}

/**
 * A member's complete position and history, keyed by the member's document id
 * within their group (every SHG record's `memberId`, and the opening-balance
 * map keys, are member document ids, never Auth uids).
 */
export async function getMemberDetail(db: Firestore, groupId: string, memberId: string): Promise<ShgMemberDetail> {
  // Validate before any query is issued: every read below builds paths from these ids.
  assertId(groupId, "Group");
  assertId(memberId, "Member");
  const [member, loans, history, opening, openingRepayments, charges, savingsEntries, attended, meetingsRecorded] = await Promise.all([
    getMember(db, groupId, memberId),
    combinedLoansOfGroup(db, groupId, memberId),
    memberTransactions(db, groupId, memberId, ["saving", "repayment", "opening-repayment", "monthly-charge", "disbursement"]),
    readOpening(db, groupId),
    openingRepaymentsOf(db, groupId, memberId),
    boundedGet(db.collection(`${groupPath(groupId)}/monthlyCharges`).where("memberId", "==", memberId).select("kind", "amount"), LIMITS.memberHistoryPerKind, "member-history"),
    boundedGet(db.collection(`${groupPath(groupId)}/savings`).where("memberId", "==", memberId).select("amount"), LIMITS.memberHistoryPerKind, "member-history"),
    db.collection(`${groupPath(groupId)}/meetings`).where("attendeeIds", "array-contains", memberId).count().get(),
    db.collection(`${groupPath(groupId)}/meetings`).count().get(),
  ]);
  const account = memberAccount({
    memberId,
    cachedTotalSavings: member.cachedTotalSavings,
    savingsEntries: savingsEntries.map((d) => ({ amount: Number(d.get("amount")) || 0 })),
    loans,
    maps: opening.maps,
    openingRepayments,
    monthlyCharges: charges.map((d) => ({ kind: String(d.get("kind") || "lateFee"), amount: Number(d.get("amount")) || 0 })),
    meetings: { attended: attended.data().count, recorded: meetingsRecorded.data().count },
    openingAsOf: opening.balance?.asOf ?? null,
  });
  const named = history.items.map((t) => (t.memberName ? t : { ...t, memberName: member.name }));
  return {
    member,
    account,
    loans,
    history: {
      items: [...named, ...openingHistory(groupId, member, opening.maps, opening.balance?.asOf ?? null)].sort(byDateDesc((t) => t.date)),
      truncated: history.truncated,
    },
  };
}

/** The member's pre-app position as history entries, dated when it was captured. */
function openingHistory(groupId: string, member: ShgMember, maps: ShgOpeningMemberMaps, asOf: Date | null): ShgTransaction[] {
  const entries: [string, number | undefined][] = [
    ["savings", maps.savings[member.id]],
    ["loanTaken", maps.loanTaken[member.id]],
    ["loanOutstanding", maps.loanBalanceOriginal[member.id] ?? maps.loanBalance[member.id]],
    ["interestPaid", maps.interestPaid[member.id]],
    ["lateFeesPaid", maps.lateFeesPaid[member.id]],
    ["lateFeesDue", maps.lateFeesDueOriginal[member.id] ?? maps.lateFeesDue[member.id]],
  ];
  return entries
    .filter(([, amount]) => typeof amount === "number" && amount !== 0)
    .map(([kind, amount]) => ({
      key: `opening-balance:${groupId}:${member.id}:${kind}`,
      id: `${member.id}:${kind}`,
      groupId,
      kind: "opening-balance",
      memberId: member.id,
      memberName: member.name,
      amount: amount!,
      date: asOf,
      period: null,
      isReversal: false,
      notes: null,
      loanId: null,
      meetingId: null,
      openingKind: kind,
      chargeKind: null,
      appliesToPeriod: null,
    }));
}

// ── Meetings ──────────────────────────────────────────────────────────────────

export async function listMeetings(db: Firestore, params: { groupId?: string | null; cursor?: string | null; pageSize?: number }) {
  const groupIds = params.groupId ? [assertId(params.groupId, "Group")] : (await listAllGroups(db)).map((g) => g.id);
  return mergedPage(db, {
    sources: groupIds.map((g) => ({
      key: `meetings|${g}`,
      collectionPath: `${groupPath(g)}/meetings/`,
      query: db.collection(`${groupPath(g)}/meetings`).orderBy("date", "desc"),
      map: toMeeting,
      sortValue: (m: ShgMeeting) => m.date?.getTime() ?? 0,
    })),
    cursor: params.cursor,
    direction: "desc",
    pageSize: params.pageSize,
  });
}

// ── Overview ──────────────────────────────────────────────────────────────────

/** Σ over every group's GroupFinancials, plus the top 10 groups by total savings. */
export async function getOverview(db: Firestore, now: Date = new Date()): Promise<ShgOverview> {
  const groups = await listAllGroups(db);
  const financials = await Promise.all(groups.map((g) => getGroupFinancials(db, g.id, now)));
  const total = sumFinancials(financials);
  const since = now.getTime() - 30 * DAY_MS;
  return {
    groups: groups.length,
    groupsAddedLast30Days: groups.filter((g) => g.createdAt && g.createdAt.getTime() >= since).length,
    members: total.members,
    savings: total.savings,
    loans: total.loans,
    topGroupsBySavings: groups
      .map((g, i) => ({
        id: g.id,
        name: g.name,
        village: g.village,
        savings: financials[i].savings.total,
        openingSavings: financials[i].savings.opening,
        recordedSavings: financials[i].savings.recorded,
      }))
      .sort((a, b) => b.savings - a.savings || a.name.localeCompare(b.name))
      .slice(0, 10),
    asOf: now,
  };
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function getReport(db: Firestore, groupId: string, year: number): Promise<ShgReport & { truncated: boolean }> {
  assertId(groupId, "Group");
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new InvalidCursorError();
  const group = await db.doc(groupPath(groupId)).get();
  if (!group.exists) throw new ShgNotFoundError("Group");

  const firstPeriod = `${year}-01`;
  const lastPeriod = `${year}-12`;
  const [yearStart, yearEnd] = istYearRange(year).map((d) => Timestamp.fromDate(d));
  const sub = (name: string) => db.collection(`${groupPath(groupId)}/${name}`);
  const byPeriod = (name: string) => sub(name).where("period", ">=", firstPeriod).where("period", "<=", lastPeriod);
  const byDate = (name: string, field: string) => sub(name).where(field, ">=", yearStart).where(field, "<", yearEnd);
  const limit = LIMITS.reportRecordsPerKind;

  const [savings, repayments, loans, openingRepayments, monthlyCharges, meetings, closures, ruleVersions, opening] =
    await Promise.all([
      byPeriod("savings").limit(limit).get(),
      byDate("repayments", "date").limit(limit).get(),
      byDate("loans", "disbursedAt").limit(limit).get(),
      byPeriod("openingRepayments").limit(limit).get(),
      byPeriod("monthlyCharges").limit(limit).get(),
      byPeriod("meetings").limit(limit).get(),
      byPeriod("monthlyClosures").limit(limit).get(),
      sub("ruleVersions").limit(limit).get(),
      db.doc(`${groupPath(groupId)}/openingBalance/current`).get(),
    ]);
  const truncated = [savings, repayments, loans, openingRepayments, monthlyCharges, meetings].some((s) => s.size >= limit);

  const versions = ruleVersions.docs
    .map(toRuleVersion)
    .filter((v) => v !== null)
    .sort(compareRuleVersions)
    // Never send the author uid to the browser.
    .map(
      (v, index): ShgRuleVersion => ({
        // The document id is `{effectiveFrom}_r{revision}_{authorUid}`: never
        // expose it. A positional key is enough for display.
        id: `${v.effectiveFrom}#r${v.revision}#${index}`,
        effectiveFrom: v.effectiveFrom,
        revision: v.revision,
        monthlySavings: v.monthlySavings,
        latePenalty: v.latePenalty,
        meetingDay: v.meetingDay,
        graceDays: v.graceDays,
        updatedAt: v.updatedAt,
      }),
    );

  const report = buildReport({
    groupId,
    year,
    transactions: [
      ...savings.docs.map(savingToTransaction),
      ...repayments.docs.map(repaymentToTransaction),
      ...loans.docs.map(disbursementToTransaction),
      ...openingRepayments.docs.map(openingRepaymentToTransaction),
      ...monthlyCharges.docs.map(monthlyChargeToTransaction),
    ],
    meetings: meetings.docs.map(toMeeting),
    closures: closures.docs.map(toMonthlyClosure),
    ruleVersions: versions,
    openingBalance: toOpeningBalance(opening),
  });
  return { ...report, truncated };
}

// ── Merging / pagination ──────────────────────────────────────────────────────

const byDateDesc =
  <T>(get: (item: T) => Date | null) =>
  (a: T, b: T) =>
    (get(b)?.getTime() ?? 0) - (get(a)?.getTime() ?? 0);

interface Source<T> {
  key: string;
  /** Collection path (with trailing slash) every cursor anchor must live in. */
  collectionPath: string;
  query: Query<DocumentData>;
  map: (snap: QueryDocumentSnapshot<DocumentData>) => T;
  sortValue: (item: T) => number | string;
}

/**
 * Newest/first `pageSize` rows across several ordered sources. Each source is
 * queried after its own anchor with limit(pageSize + 1); rows are merged; the
 * next cursor records per source the last row actually shown, so nothing is
 * skipped or repeated, and "has more" is exact (no empty trailing page).
 */
async function mergedPage<T>(
  db: Firestore,
  opts: { sources: Source<T>[]; cursor?: string | null; direction: "asc" | "desc"; pageSize?: number },
): Promise<Page<T>> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? LIMITS.pageSize, 1), 100);
  const prefixes = new Map(opts.sources.map((s) => [s.key, s.collectionPath]));
  const previous: CursorState = decodeCursor(opts.cursor, (key) => prefixes.get(key) ?? null) ?? {};

  const fetched = await Promise.all(
    opts.sources.map(async (source) => {
      const state = previous[source.key];
      if (state === "done") return { source, docs: [] as QueryDocumentSnapshot[] };
      let query = source.query;
      if (state) {
        const anchor = await db.doc(state).get();
        if (!anchor.exists) throw new InvalidCursorError();
        query = query.startAfter(anchor);
      }
      const snap = await query.limit(pageSize + 1).get();
      return { source, docs: snap.docs };
    }),
  );

  const sign = opts.direction === "asc" ? 1 : -1;
  const rows = fetched.flatMap(({ source, docs }) => docs.map((snap) => ({ source, snap, item: source.map(snap) })));
  rows.sort((a, b) => {
    const av = a.source.sortValue(a.item);
    const bv = b.source.sortValue(b.item);
    if (av !== bv) return (av < bv ? -1 : 1) * sign;
    // Ties must break exactly as Firestore breaks them within a source: by
    // document path, in the SAME direction as the ordering. Otherwise a page
    // boundary inside a tie anchors `startAfter` on a document Firestore
    // considers later, and unshown rows are skipped.
    return (a.snap.ref.path < b.snap.ref.path ? -1 : 1) * sign;
  });
  const shown = rows.slice(0, pageSize);

  const next: CursorState = {};
  let hasMore = false;
  for (const { source, docs } of fetched) {
    const consumed = shown.filter((row) => row.source.key === source.key);
    const exhausted = previous[source.key] === "done" || (docs.length <= pageSize && consumed.length === docs.length);
    if (exhausted) {
      next[source.key] = "done";
      continue;
    }
    hasMore = true;
    const last = consumed.at(-1);
    const prev = previous[source.key];
    if (last) next[source.key] = last.snap.ref.path;
    else if (prev && prev !== "done") next[source.key] = prev;
  }
  return { items: shown.map((row) => row.item), next: hasMore ? asCursor(encodeCursor(next)) : null };
}

/** Pagination over an already-bounded, in-memory list. */
function offsetPage<T>(items: T[], cursor: string | null | undefined, pageSize: number = LIMITS.pageSize): Page<T> {
  let offset = 0;
  if (cursor) {
    const state = decodeCursor(cursor, (key) => (key === "offset" ? "" : null));
    const raw = state?.offset;
    offset = raw && /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > items.length) throw new InvalidCursorError();
  }
  const end = offset + pageSize;
  return {
    items: items.slice(offset, end),
    next: end < items.length ? asCursor(encodeCursor({ offset: String(end) })) : null,
  };
}
