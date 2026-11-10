import type { BackendKey } from "@/lib/firebase/apps";

/**
 * The Firebase project that identifies console users: the Ozey Workforce
 * identity project (ozey-workforce[-dev]). Employees sign in with their
 * @ozey.in Google account. Product customer identities (e.g. SHG's phone
 * accounts) are never used to sign in to the console.
 */
export const CONSOLE_IDENTITY_BACKEND: BackendKey = "workforce";
