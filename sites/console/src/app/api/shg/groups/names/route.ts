// Read-only. GET only: Next.js answers every other method with 405.
import { getGroupNames } from "@/lib/server/shg/core/data.ts";
import { shgRoute } from "@/lib/server/shg";

export const GET = shgRoute(({ db, search }) => getGroupNames(db, (search.get("ids") ?? "").split(",").filter(Boolean)));
