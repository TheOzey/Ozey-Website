// Read-only. GET only: Next.js answers every other method with 405.
import { listMeetings } from "@/lib/server/shg/core/data.ts";
import { shgRoute } from "@/lib/server/shg";

export const GET = shgRoute(({ db, search }) => listMeetings(db, { groupId: search.get("group"), cursor: search.get("cursor") }));
