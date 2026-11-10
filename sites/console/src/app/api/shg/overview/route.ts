// Read-only. GET only: Next.js answers every other method with 405.
import { getOverview } from "@/lib/server/shg/core/data.ts";
import { shgRoute } from "@/lib/server/shg";

export const GET = shgRoute(({ db }) => getOverview(db));
