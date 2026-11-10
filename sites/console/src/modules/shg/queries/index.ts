"use client";

import { useQuery } from "@tanstack/react-query";
import { useCursorPagination } from "@/lib/hooks/use-cursor-pagination";
import {
  getGroupDetail,
  getGroupNames,
  getMemberDetail,
  getOverview,
  getReport,
  listGroupLoans,
  listGroupMeetings,
  listGroupRoster,
  listGroups,
  listLoans,
  listMeetings,
  listMembers,
  listTransactions,
  type LoanStatusFilter,
  searchGroups,
  type TransactionFilters,
} from "../services";

// All SHG query keys start with "shg" so the whole workspace cache can be
// cleared at once (e.g. on sign-out) without touching other products.
const k = {
  overview: () => ["shg", "overview"] as const,
  groups: (search: string) => ["shg", "groups", { search }] as const,
  group: (id: string) => ["shg", "group", id] as const,
  groupNames: (ids: string[]) => ["shg", "group-names", [...ids].sort()] as const,
  groupSearch: (term: string) => ["shg", "group-search", term] as const,
  members: (groupId: string | null, search: string) => ["shg", "members", { groupId, search }] as const,
  member: (groupId: string, memberId: string) => ["shg", "member", groupId, memberId] as const,
  loans: (groupId: string | null, status: LoanStatusFilter | null) => ["shg", "loans", { groupId, status }] as const,
  transactions: (filters: TransactionFilters) => ["shg", "transactions", filters] as const,
  meetings: (groupId: string | null) => ["shg", "meetings", { groupId }] as const,
  report: (groupId: string, year: number) => ["shg", "report", groupId, year] as const,
};

// ── Overview (aggregates across every group, one server call) ───────────────

export const useShgOverview = () => useQuery({ queryKey: k.overview(), queryFn: getOverview });

// ── Groups ──────────────────────────────────────────────────────────────────

export const useGroupsPage = (search: string) =>
  useCursorPagination(k.groups(search), (cursor) => listGroups({ search, cursor }));

const useGroupDetail = <T>(groupId: string, select: (d: Awaited<ReturnType<typeof getGroupDetail>>) => T) =>
  useQuery({ queryKey: k.group(groupId), queryFn: () => getGroupDetail(groupId), enabled: Boolean(groupId), select });

export const useGroup = (groupId: string) => useGroupDetail(groupId, (d) => d.group);
export const useGroupFinancials = (groupId: string) => useGroupDetail(groupId, (d) => d.financials);
export const useGroupOpeningBalance = (groupId: string) => useGroupDetail(groupId, (d) => d.openingBalance);

export const useGroupRoster = (groupId: string) =>
  useQuery({ queryKey: [...k.group(groupId), "roster"], queryFn: () => listGroupRoster(groupId), enabled: Boolean(groupId) });

export const useGroupLoans = (groupId: string) =>
  useQuery({ queryKey: [...k.group(groupId), "loans"], queryFn: () => listGroupLoans(groupId), enabled: Boolean(groupId) });

export const useGroupMeetings = (groupId: string) =>
  useQuery({ queryKey: [...k.group(groupId), "meetings"], queryFn: () => listGroupMeetings(groupId), enabled: Boolean(groupId) });

/** Resolves display names for groupIds seen in cross-group results. */
export const useGroupNames = (groupIds: string[]) => {
  const ids = [...new Set(groupIds.filter(Boolean))];
  return useQuery({
    queryKey: k.groupNames(ids),
    queryFn: () => getGroupNames(ids),
    enabled: ids.length > 0,
    staleTime: 10 * 60_000,
  });
};

export const useGroupSearch = (term: string) =>
  useQuery({ queryKey: k.groupSearch(term), queryFn: () => searchGroups(term), staleTime: 60_000 });

// ── Members ─────────────────────────────────────────────────────────────────

export const useMembersPage = (groupId: string | null, search: string) =>
  useCursorPagination(k.members(groupId, search), (cursor) => listMembers({ groupId, search, cursor }));

const useMemberDetail = <T>(groupId: string, memberId: string, select: (d: Awaited<ReturnType<typeof getMemberDetail>>) => T) =>
  useQuery({ queryKey: k.member(groupId, memberId), queryFn: () => getMemberDetail(groupId, memberId), select });

export const useMember = (groupId: string, memberId: string) => useMemberDetail(groupId, memberId, (d) => d.member);
export const useMemberAccount = (groupId: string, memberId: string) => useMemberDetail(groupId, memberId, (d) => d.account);
export const useMemberHistory = (groupId: string, memberId: string) => useMemberDetail(groupId, memberId, (d) => d.history);
export const useMemberLoans = (groupId: string, memberId: string) => useMemberDetail(groupId, memberId, (d) => d.loans);

// ── Loans, transactions, meetings, reports ───────────────────────────────────

export const useLoansPage = (groupId: string | null, status: LoanStatusFilter | null) =>
  useCursorPagination(k.loans(groupId, status), (cursor) => listLoans({ groupId, status, cursor }));

export const useTransactionsPage = (filters: TransactionFilters) =>
  useCursorPagination(k.transactions(filters), (cursor) => listTransactions(filters, cursor));

export const useMeetingsPage = (groupId: string | null) =>
  useCursorPagination(k.meetings(groupId), (cursor) => listMeetings({ groupId, cursor }));

export const useReport = (groupId: string | null, year: number) =>
  useQuery({ queryKey: k.report(groupId ?? "", year), queryFn: () => getReport(groupId!, year), enabled: Boolean(groupId) });
