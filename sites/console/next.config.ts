import type { NextConfig } from "next";

// The console is served under www.ozey.in/dashboard. `basePath` keeps every
// route and asset under that prefix so the corporate site can proxy
// `/dashboard/*` to this app (multi-zone) without path rewriting.
const nextConfig: NextConfig = {
  basePath: "/dashboard",
  reactStrictMode: true,
  poweredByHeader: false,
  // firebase-admin is external by default in Next.js; these two must be too.
  // If bundled, the server holds a second copy of the Firestore classes, and
  // firebase-admin's FieldValue sentinels (e.g. serverTimestamp) are rejected
  // by a client built from the bundled copy (gcloud credentials mode).
  serverExternalPackages: ["@google-cloud/firestore", "google-auth-library"],
  // Pre-IA-refactor URLs. Members, transactions, loans and meetings are now
  // group-scoped; an old link that names a group lands on that group's section
  // (other filters carry over in the query string), otherwise on Groups.
  async redirects() {
    const sections = ":section(members|transactions|loans|meetings)";
    return [
      { source: "/shg/members/:groupId/:memberId", destination: "/shg/groups/:groupId/members/:memberId", permanent: false },
      {
        source: `/shg/${sections}`,
        has: [{ type: "query", key: "group", value: "(?<group>[^&]+)" }],
        destination: "/shg/groups/:group/:section",
        permanent: false,
      },
      { source: `/shg/${sections}`, destination: "/shg/groups", permanent: false },
      { source: "/shg/employees", destination: "/employees", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Internal tool: keep it out of search indexes.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
