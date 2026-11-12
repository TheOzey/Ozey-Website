import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  // beUI registry installs under components/motion; keep vendor rules muted.
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "src/components/motion/**"] },
  // Tests assert on arbitrary JSON API responses.
  { files: ["tests/**/*.ts"], rules: { "@typescript-eslint/no-explicit-any": "off" } },
];

export default config;
