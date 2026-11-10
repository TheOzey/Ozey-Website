import { type FirebaseApp, type FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";

/**
 * Registry of Firebase backends the console talks to.
 *
 * `workforce` is the Ozey employee identity project (ozey-workforce[-dev]),
 * the only Firebase project the browser talks to. Product data (SHG, …) is
 * never read from the browser: it is served by the console's server routes
 * under short-lived, read-only server credentials (see lib/server/shg).
 */
export type BackendKey = "workforce";

interface BackendConfig {
  options: FirebaseOptions;
  useEmulators: boolean;
  /** Local emulator ports, distinct per backend so both can run side by side. */
  emulatorPorts: { auth: number; firestore: number };
  appCheckSiteKey?: string;
}

// NEXT_PUBLIC_* values must be referenced literally so Next.js inlines them.
const BACKENDS: Record<BackendKey, BackendConfig> = {
  workforce: {
    options: {
      apiKey: process.env.NEXT_PUBLIC_WORKFORCE_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_WORKFORCE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_WORKFORCE_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_WORKFORCE_FIREBASE_APP_ID,
    },
    useEmulators: process.env.NEXT_PUBLIC_WORKFORCE_USE_EMULATORS === "true",
    emulatorPorts: { auth: 9299, firestore: 8280 },
  },
};

export class BackendConfigError extends Error {
  constructor(key: BackendKey, missing: string[]) {
    super(`Firebase backend "${key}" is missing configuration: ${missing.join(", ")}`);
    this.name = "BackendConfigError";
  }
}

export function getBackendConfig(key: BackendKey): BackendConfig {
  const config = BACKENDS[key];
  const missing = (["apiKey", "authDomain", "projectId", "appId"] as const).filter(
    (field) => !config.options[field],
  );
  if (missing.length > 0) throw new BackendConfigError(key, missing);
  return config;
}

/** Returns the named Firebase app for a backend, initialising it once. */
export function getBackendApp(key: BackendKey): FirebaseApp {
  const existing = getApps().find((app) => app.name === key);
  if (existing) return getApp(key);
  return initializeApp(getBackendConfig(key).options, key);
}
