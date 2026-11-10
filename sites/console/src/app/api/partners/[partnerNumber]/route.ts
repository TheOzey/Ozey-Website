import type { NextRequest } from "next/server";
import { isPartnerStatus, validateNewPartner } from "@/lib/partners/model";
import {
  DuplicatePartnerMobileError,
  getPartner,
  PartnerNotFoundError,
  PartnerPermissionError,
  PartnerTerminatedError,
  setPartnerStatus,
  updatePartner,
} from "@/lib/server/partner-admin";
import { PartnerCodeConflictError } from "@/lib/server/partner-codes";
import { authorizePartnerMutation, authorizePartnerRead, PARTNER_NUMBER_PARAM, partnerJson as json } from "@/lib/server/partner-api";

type Context = { params: Promise<{ partnerNumber: string }> };

function failure(error: unknown, action: string) {
  if (error instanceof PartnerNotFoundError) return json(404, { error: "not-found" });
  if (error instanceof PartnerTerminatedError) return json(409, { error: "partner-terminated" });
  if (error instanceof PartnerPermissionError) return json(403, { error: "missing-permission" });
  if (error instanceof DuplicatePartnerMobileError) {
    return json(409, { error: "duplicate-mobile", fields: { mobile: "A partner with this mobile number already exists." } });
  }
  if (error instanceof PartnerCodeConflictError) {
    return json(409, { error: "partner-id-conflict" });
  }
  console.error(`partner ${action} failed`, (error as Error).name);
  return json(500, { error: "unavailable" });
}

/** GET /api/partners/OZEY-DS-0001 — read one partner. */
export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await authorizePartnerRead(_request);
  if (!auth.ok) return auth.response;
  const { partnerNumber } = await params;
  if (!PARTNER_NUMBER_PARAM.test(partnerNumber)) return json(404, { error: "not-found" });

  try {
    return json(200, { partner: await getPartner(partnerNumber) });
  } catch (error) {
    return failure(error, "read");
  }
}

/** PATCH /api/partners/OZEY-DS-0001 — update partner fields. */
export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await authorizePartnerMutation(request);
  if (!auth.ok) return auth.response;
  const { partnerNumber } = await params;
  if (!PARTNER_NUMBER_PARAM.test(partnerNumber)) return json(404, { error: "not-found" });

  const result = validateNewPartner(await request.json().catch(() => null));
  if (!result.ok) return json(400, { error: "invalid", fields: result.errors });

  try {
    const { partner, changed } = await updatePartner(partnerNumber, result.value, auth.actor);
    return json(200, { partner, changed });
  } catch (error) {
    return failure(error, "update");
  }
}

/**
 * POST /api/partners/OZEY-DS-0001 — status change (`inactive` or `terminated`).
 * Active restoration is not supported in this phase.
 */
export async function POST(request: NextRequest, { params }: Context) {
  const auth = await authorizePartnerMutation(request);
  if (!auth.ok) return auth.response;
  const { partnerNumber } = await params;
  if (!PARTNER_NUMBER_PARAM.test(partnerNumber)) return json(404, { error: "not-found" });

  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = body?.status;
  if (status !== "inactive" && status !== "terminated") {
    return json(400, { error: "invalid", fields: { status: "Status must be inactive or terminated." } });
  }
  if (!isPartnerStatus(status)) return json(400, { error: "invalid", fields: { status: "Unknown status." } });

  try {
    return json(200, { partner: await setPartnerStatus(partnerNumber, status, auth.actor) });
  } catch (error) {
    return failure(error, "status");
  }
}
