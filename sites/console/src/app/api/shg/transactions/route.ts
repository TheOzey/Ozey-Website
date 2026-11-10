// Read-only. GET only: Next.js answers every other method with 405.
import { listTransactions, TRANSACTION_KINDS } from "@/lib/server/shg/core/data.ts";
import { shgRoute } from "@/lib/server/shg";

export const GET = shgRoute(({ db, search }) => {
  const type = search.get("type");
  const kinds = TRANSACTION_KINDS.find((k) => k === type);
  return listTransactions(db, {
    kinds: kinds ? [kinds] : undefined,
    groupId: search.get("group"),
    memberId: search.get("member"),
    from: search.get("from"),
    to: search.get("to"),
    cursor: search.get("cursor"),
  });
});
