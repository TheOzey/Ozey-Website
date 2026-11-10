// Read-only. GET only: Next.js answers every other method with 405.
import { listMembers } from "@/lib/server/shg/core/data.ts";
import { shgRoute } from "@/lib/server/shg";

export const GET = shgRoute(({ db, search }) =>
  listMembers(db, { groupId: search.get("group"), search: search.get("q") ?? "", cursor: search.get("cursor") }),
);
