// Read-only. GET only: Next.js answers every other method with 405.
import { getReport, ShgNotFoundError } from "@/lib/server/shg/core/data.ts";
import { shgRoute } from "@/lib/server/shg";

export const GET = shgRoute(({ db, search }) => {
  const groupId = search.get("group");
  if (!groupId) throw new ShgNotFoundError("Group");
  const year = Number(search.get("year") ?? new Date().getFullYear());
  return getReport(db, groupId, year);
});
