import assert from "node:assert/strict";
import { test } from "node:test";
import { createReaderTokenProvider, DATASTORE_SCOPE, ShgCredentialError } from "../../src/lib/server/shg/core/reader-credentials.ts";

const SA = "workforce-shg-reader@ozey-shg.iam.gserviceaccount.com";
const okResponse = (token: string, expireTime: string) => new Response(JSON.stringify({ accessToken: token, expireTime }), { status: 200 });

test("impersonates the reader with Firestore-only scope and a 900 s lifetime", async () => {
  let seen: { url: string; body: { scope: string[]; lifetime: string }; auth: string | null } | null = null;
  const p = createReaderTokenProvider({
    serviceAccount: SA,
    lifetimeSeconds: 900,
    callerToken: async () => "caller-token",
    now: () => Date.parse("2026-10-02T00:00:00Z"),
    fetchImpl: async (url, init) => {
      seen = { url: String(url), body: JSON.parse(String(init?.body)), auth: new Headers(init?.headers).get("authorization") };
      return okResponse("reader-1", "2026-10-02T00:15:00Z");
    },
  });
  const t = await p.getToken();
  assert.equal(t.token, "reader-1");
  assert.ok(seen!.url.includes(`/serviceAccounts/${encodeURIComponent(SA)}:generateAccessToken`));
  assert.deepEqual(seen!.body, { scope: [DATASTORE_SCOPE], lifetime: "900s" });
  assert.equal(seen!.auth, "Bearer caller-token");
});

test("caches until 60 s before expiry, then mints again; concurrent callers share one mint", async () => {
  let now = Date.parse("2026-10-02T00:00:00Z");
  let mints = 0;
  const p = createReaderTokenProvider({
    serviceAccount: SA, lifetimeSeconds: 900, callerToken: async () => "c", now: () => now,
    fetchImpl: async () => okResponse(`t${++mints}`, new Date(now + 900_000).toISOString()),
  });
  const [a, b] = await Promise.all([p.getToken(), p.getToken()]);
  assert.equal(mints, 1);
  assert.equal(a.token, b.token);
  now += 830_000; // 70 s left: still cached
  assert.equal((await p.getToken()).token, "t1");
  now += 20_000; // 50 s left: refresh
  assert.equal((await p.getToken()).token, "t2");
});

for (const [name, cfg] of [
  ["no caller identity", { callerToken: async () => { throw new Error("no ADC"); } }],
  ["IAM refuses impersonation (403)", { fetchImpl: async () => new Response("{}", { status: 403 }) }],
  ["network failure", { fetchImpl: async () => { throw new TypeError("fetch failed"); } }],
  ["malformed response", { fetchImpl: async () => new Response(JSON.stringify({ nope: true }), { status: 200 }) }],
  ["already-expired token", { fetchImpl: async () => okResponse("old", "2026-10-01T00:00:00Z") }],
] as const) {
  test(`fails closed with ShgCredentialError: ${name}`, async () => {
    const defaults = {
      serviceAccount: SA, lifetimeSeconds: 900, now: () => Date.parse("2026-10-02T00:00:00Z"),
      callerToken: async () => "c", fetchImpl: async () => okResponse("x", "2026-10-02T00:15:00Z"),
    };
    const p = createReaderTokenProvider({ ...defaults, ...cfg });
    await assert.rejects(p.getToken(), ShgCredentialError);
  });
}

test("error messages never contain token material", async () => {
  const p = createReaderTokenProvider({
    serviceAccount: SA, lifetimeSeconds: 900, callerToken: async () => "SECRET-CALLER",
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: "denied SECRET-CALLER" } }), { status: 403 }),
  });
  await assert.rejects(p.getToken(), (e: Error) => !e.message.includes("SECRET"));
});
