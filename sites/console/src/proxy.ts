import { type NextRequest, NextResponse } from "next/server";

// Must match SESSION_COOKIE in lib/server/session.ts (proxy cannot import server-only modules).
const SESSION_COOKIE = "ozey_console_session";

/**
 * Optimistic gate: requests without a session cookie go to sign-in before any
 * page renders. The real check (signature, revocation, employee status)
 * happens server-side in the console layout and API routes.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/login";
  url.search = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  // Pages only. API routes (session, /api/shg/*) enforce authorization
  // themselves and must answer 401/403, not redirect to a sign-in page.
  matcher: ["/((?!login|api/|_next/|favicon.ico).*)"],
};
