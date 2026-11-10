// Read-only. GET only: Next.js answers every other method with 405.
import { getMemberDetail } from "@/lib/server/shg/core/data.ts";
import { shgRoute } from "@/lib/server/shg";

export const GET = shgRoute<{ groupId: string; memberId: string }>(({ db, params }) =>
  getMemberDetail(db, params.groupId, params.memberId),
);
