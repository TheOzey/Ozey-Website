// Read-only. GET only: Next.js answers every other method with 405.
import { getGroupDetail } from "@/lib/server/shg/core/data.ts";
import { shgRoute } from "@/lib/server/shg";

export const GET = shgRoute<{ groupId: string }>(({ db, params }) => getGroupDetail(db, params.groupId));
