import { type NextRequest, NextResponse } from "next/server";
import { admitEmployee, discardRefusedAccount } from "@/lib/server/admission";
import { audit, forgetEmployee, getEmployeeByAuthUid } from "@/lib/server/employees";
import { isSameOrigin } from "@/lib/server/same-origin";
import { MAX_SIGN_IN_AGE_S, SESSION_COOKIE, SESSION_MAX_AGE_MS, SESSION_PATH } from "@/lib/server/session";
import { workforceAuth } from "@/lib/server/workforce-admin";


const deny = (status: number) => NextResponse.json({ ok: false }, { status });

/**
 * POST: exchange a fresh workforce Google ID token for an HttpOnly session cookie.
 * Admission (employee match, link, activation) happens here server-side; when
 * blocking functions are deployed they are an additional, earlier check.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return deny(403);
  const body = (await request.json().catch(() => null)) as { idToken?: unknown } | null;
  if (typeof body?.idToken !== "string") return deny(400);

  const auth = workforceAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(body.idToken, true);
  } catch {
    return deny(401);
  }
  if (decoded.firebase.sign_in_provider !== "google.com") return deny(403);
  if (Date.now() / 1000 - decoded.auth_time > MAX_SIGN_IN_AGE_S) return deny(401);

  const admission = await admitEmployee(decoded);
  if (!admission.admitted) {
    const discarded = await discardRefusedAccount(decoded.uid);
    await audit({
      action: "sign-in-denied",
      actor: null,
      target: decoded.email ?? decoded.uid,
      reason: admission.reason,
      authRecordDiscarded: discarded,
    });
    return deny(403);
  }

  const employee = await getEmployeeByAuthUid(decoded.uid, { fresh: true });
  if (!employee || employee.status !== "active") {
    await audit({ action: "session-denied", actor: employee?.id ?? null, target: decoded.email ?? decoded.uid });
    return deny(403);
  }

  const cookie = await auth.createSessionCookie(body.idToken, { expiresIn: SESSION_MAX_AGE_MS });
  await audit({ action: "session-created", actor: employee.id, target: employee.id });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, cookie, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: SESSION_PATH,
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return response;
}

/** DELETE: sign out. Revokes the employee's workforce refresh tokens too. */
export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return deny(403);
  const value = request.cookies.get(SESSION_COOKIE)?.value;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: SESSION_PATH, maxAge: 0 });
  if (value) {
    try {
      const { uid, auth_time } = await workforceAuth().verifySessionCookie(value);
      // Firebase revocation has one-second precision and only revokes sessions
      // whose auth_time is strictly earlier than the revocation second. Wait out
      // the sign-in second so even a session created moments ago is revoked.
      const wait = (auth_time + 1) * 1000 - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      await workforceAuth().revokeRefreshTokens(uid);
      const employee = await getEmployeeByAuthUid(uid);
      forgetEmployee(uid);
      await audit({ action: "signed-out", actor: employee?.id ?? null, target: employee?.id ?? uid });
    } catch {
      // Already invalid or expired: clearing the cookie is enough.
    }
  }
  return response;
}
