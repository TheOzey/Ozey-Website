/**
 * Short-lived credentials for the SHG read identity (workforce-shg-reader).
 *
 * The console server never holds a key for it. It asks the IAM Service Account
 * Credentials API to mint a ≤ 15-minute OAuth access token by impersonation,
 * scoped to Firestore only. The caller identity (the developer's gcloud login
 * locally; the console's own workload identity in production) must hold
 * Token Creator on that one service account. The reader's IAM role
 * (projects/ozey-shg/roles/workforceShgReader) grants only
 * datastore.entities.get and datastore.entities.list.
 *
 * Fails closed: any failure raises ShgCredentialError, never a fallback.
 */
export const DATASTORE_SCOPE = "https://www.googleapis.com/auth/datastore";

export class ShgCredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShgCredentialError";
  }
}

export interface ReaderTokenConfig {
  serviceAccount: string;
  /** Token lifetime in seconds (≤ 3600; the console uses 900). */
  lifetimeSeconds: number;
  /** Access token of the impersonating caller. */
  callerToken: () => Promise<string>;
  /** Project billed for the impersonation call (has iamcredentials enabled). */
  quotaProject?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export interface ReaderToken {
  token: string;
  expiresAt: number;
}

export function createReaderTokenProvider(config: ReaderTokenConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const now = config.now ?? Date.now;
  let cached: ReaderToken | null = null;
  let pending: Promise<ReaderToken> | null = null;

  async function mint(): Promise<ReaderToken> {
    let caller: string;
    try {
      caller = await config.callerToken();
    } catch {
      throw new ShgCredentialError("No caller identity available to impersonate the SHG reader");
    }
    let res: Response;
    try {
      res = await fetchImpl(
        `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(config.serviceAccount)}:generateAccessToken`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${caller}`,
            "Content-Type": "application/json",
            ...(config.quotaProject ? { "x-goog-user-project": config.quotaProject } : {}),
          },
          body: JSON.stringify({ scope: [DATASTORE_SCOPE], lifetime: `${config.lifetimeSeconds}s` }),
        },
      );
    } catch {
      throw new ShgCredentialError("SHG credential service unreachable");
    }
    if (!res.ok) throw new ShgCredentialError(`SHG credential exchange refused (HTTP ${res.status})`);
    const body = (await res.json().catch(() => null)) as { accessToken?: unknown; expireTime?: unknown } | null;
    const expiresAt = typeof body?.expireTime === "string" ? Date.parse(body.expireTime) : NaN;
    if (typeof body?.accessToken !== "string" || !Number.isFinite(expiresAt)) {
      throw new ShgCredentialError("SHG credential exchange returned an unusable token");
    }
    if (expiresAt <= now()) throw new ShgCredentialError("SHG credential exchange returned an expired token");
    return { token: body.accessToken, expiresAt };
  }

  return {
    /** A valid token with at least 60 s left, minting a new one when needed. */
    async getToken(): Promise<ReaderToken> {
      if (cached && cached.expiresAt - now() > 60_000) return cached;
      pending ??= mint()
        .then((t) => (cached = t))
        .finally(() => {
          pending = null;
        });
      return pending;
    },
    /** Drop the cached token (e.g. after the API rejects it). */
    invalidate() {
      cached = null;
    },
  };
}
