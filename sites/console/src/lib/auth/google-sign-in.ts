"use client";

import { GoogleAuthProvider, inMemoryPersistence, setPersistence, signInWithPopup, signOut } from "firebase/auth";
import { getBackendAuth } from "@/lib/firebase/services";
import { CONSOLE_IDENTITY_BACKEND } from "./identity";

/**
 * Google sign-in against the workforce project, exchanged immediately for a
 * server session cookie. The Firebase client keeps nothing afterwards (in-memory
 * persistence + sign-out), so no long-lived token lives in browser storage.
 *
 * Who may sign in is decided server-side: the OAuth consent screen's test-user
 * list, the workforce blocking functions (employee record = allowlist) and the
 * session endpoint. Nothing in the browser is trusted.
 */
export async function signInWithGoogleAndCreateSession(): Promise<void> {
  const auth = getBackendAuth(CONSOLE_IDENTITY_BACKEND);
  await setPersistence(auth, inMemoryPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const credential = await signInWithPopup(auth, provider);
  try {
    const idToken = await credential.user.getIdToken();
    const response = await fetch("/dashboard/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      credentials: "same-origin",
    });
    if (!response.ok) throw new SessionError(response.status);
  } finally {
    await signOut(auth);
  }
}

export class SessionError extends Error {
  constructor(readonly status: number) {
    super(`Session creation failed (${status})`);
  }
}

export function describeSignInError(error: unknown): string {
  if (error instanceof SessionError) {
    return error.status === 403
      ? "This account is not an active Ozey employee."
      : "Could not start a session. Please try again.";
  }
  const code = (error as { code?: string })?.code ?? "";
  const message = (error as { message?: string })?.message ?? "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "Sign-in was cancelled.";
  if (code === "auth/popup-blocked") return "Your browser blocked the sign-in window. Allow pop-ups for this site.";
  // Blocking-function rejections surface as internal errors carrying our message.
  if (message.includes("not an authorised Ozey employee")) return "This account is not an authorised Ozey employee.";
  if (code === "auth/unauthorized-domain") return "This domain is not authorised for workforce sign-in.";
  if (code === "auth/network-request-failed") return "Network error. Check your connection and try again.";
  return "Sign-in failed. Please try again.";
}
