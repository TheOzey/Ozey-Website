import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { type BackendKey, getBackendApp, getBackendConfig } from "./apps";

const activated = new Set<BackendKey>();

/**
 * Activates App Check for a backend when a site key is configured. Must run
 * before the first Auth/Firestore call on that backend. A no-op otherwise.
 */
export function ensureAppCheck(key: BackendKey): void {
  if (typeof window === "undefined" || activated.has(key)) return;
  const { appCheckSiteKey, useEmulators } = getBackendConfig(key);
  activated.add(key);
  if (!appCheckSiteKey || useEmulators) return;
  initializeAppCheck(getBackendApp(key), {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
