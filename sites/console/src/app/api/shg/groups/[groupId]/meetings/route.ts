// Read-only. GET only: Next.js answers every other method with 405.
import { listGroupMeetings } from "@/lib/server/shg/core/data.ts";
import { shgRoute } from "@/lib/server/shg";

export const GET = shgRoute<{ groupId: string }>(({ db, params }) => listGroupMeetings(db, params.groupId));
