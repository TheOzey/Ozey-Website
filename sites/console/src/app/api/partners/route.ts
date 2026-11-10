import type { NextRequest } from "next/server";
import { validateNewPartner } from "@/lib/partners/model";
import {
  createPartner,
  DuplicatePartnerMobileError,
  listPartners,
  PartnerPermissionError,
} from "@/lib/server/partner-admin";
import { PartnerCodeConflictError } from "@/lib/server/partner-codes";
import { authorizePartnerMutation, authorizePartnerRead, partnerJson as json } from "@/lib/server/partner-api";

/**
 * POST /api/partners — create an external partner (Digital Sakhi / Digital Sarathi).
 */
export async function POST(request: NextRequest) {
  const auth = await authorizePartnerMutation(request);
  if (!auth.ok) return auth.response;

  const result = validateNewPartner(await request.json().catch(() => null));
  if (!result.ok) return json(400, { error: "invalid", fields: result.errors });

  try {
    return json(201, { partner: await createPartner(result.value, auth.actor) });
  } catch (error) {
    if (error instanceof DuplicatePartnerMobileError) {
      return json(409, { error: "duplicate-mobile", fields: { mobile: "A partner with this mobile number already exists." } });
    }
    if (error instanceof PartnerPermissionError) {
      return json(403, { error: "missing-permission" });
    }
    if (error instanceof PartnerCodeConflictError) {
      return json(409, { error: "partner-id-conflict", message: "Partner ID allocation conflict. Retry creating the partner." });
    }
    console.error("partner creation failed", (error as Error).name);
    return json(500, { error: "unavailable" });
  }
}

/** GET /api/partners — list partners (read permission). */
export async function GET(request: NextRequest) {
  const auth = await authorizePartnerRead(request);
  if (!auth.ok) return auth.response;

  try {
    const partners = await listPartners();
    return json(200, { partners });
  } catch (error) {
    console.error("partner list failed", (error as Error).name);
    return json(500, { error: "unavailable" });
  }
}
