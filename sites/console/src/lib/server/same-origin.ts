import "server-only";
import type { NextRequest } from "next/server";

/** CSRF defence for state-changing endpoints: only same-origin browser requests. */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
