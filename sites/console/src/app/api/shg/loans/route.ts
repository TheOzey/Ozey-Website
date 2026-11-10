// Read-only. GET only: Next.js answers every other method with 405.
import { listLoans, type LoanStatusFilter } from "@/lib/server/shg/core/data.ts";
import { LOAN_STATUS_INDEX } from "@/lib/server/shg/core/mappers.ts";
import { shgRoute } from "@/lib/server/shg";

export const GET = shgRoute(({ db, search }) => {
  const status = search.get("status");
  return listLoans(db, {
    groupId: search.get("group"),
    status: status && status in LOAN_STATUS_INDEX ? (status as LoanStatusFilter) : null,
    cursor: search.get("cursor"),
  });
});
