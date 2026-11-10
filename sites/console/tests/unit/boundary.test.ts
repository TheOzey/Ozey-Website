// Static Console/SHG boundary check. Walks the transitive import graph of every
// employee-mutation entry point and fails if any reached file belongs to the
// SHG data layer, uses the SHG reader identity, or names the ozey-shg project.
// Employees, roles and permissions are Workforce (Console) data only.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(ROOT, "src");

const ENTRY_POINTS = [
  "src/app/api/employees/route.ts",
  "src/app/api/employees/[employeeNumber]/route.ts",
  "src/lib/server/employee-admin.ts",
  "src/lib/server/employee-api.ts",
  "src/app/api/partners/route.ts",
  "src/app/api/partners/[partnerNumber]/route.ts",
  "src/lib/server/partner-admin.ts",
  "src/lib/server/partner-api.ts",
  "src/lib/server/partner-codes.ts",
  "src/lib/server/partner-dashboard.ts",
  "src/components/admin/new-employee-form.tsx",
  "src/components/admin/new-partner-form.tsx",
  "src/components/admin/employee-actions.tsx",
  "src/components/admin/partner-actions.tsx",
  "src/app/(console)/employees/page.tsx",
  "src/app/(console)/employees/new/page.tsx",
  "src/app/(console)/employees/[employeeNumber]/edit/page.tsx",
  "src/app/(console)/employees/[employeeNumber]/(profile)/page.tsx",
  "src/app/(console)/partners/page.tsx",
  "src/app/(console)/partners/new/page.tsx",
  "src/app/(console)/partners/[partnerNumber]/(profile)/page.tsx",
  "scripts/workforce-migrate.ts",
];

const FORBIDDEN_PATHS = ["src/lib/server/shg/", "src/modules/shg/", "src/app/api/shg/"];
const FORBIDDEN_TEXT = [/ozey-shg/, /workforce-shg-reader/, /reader-credentials/, /SHG_DATA_SOURCE/, /\/api\/shg\//];

const IMPORT = /(?:import|export)\s[^"']*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|^\s*import\s+["']([^"']+)["']/gm;

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null; // package
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(candidate) && !candidate.endsWith("/")) {
      try {
        readFileSync(candidate);
        return candidate;
      } catch {
        /* directory */
      }
    }
  }
  return null;
}

function graph(): { files: Set<string>; packages: Set<string> } {
  const files = new Set<string>();
  const packages = new Set<string>();
  const queue = ENTRY_POINTS.map((p) => join(ROOT, p));
  while (queue.length) {
    const file = queue.pop()!;
    if (files.has(file)) continue;
    files.add(file);
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(IMPORT)) {
      const spec = m[1] ?? m[2] ?? m[3];
      const target = resolveImport(file, spec);
      if (target) queue.push(target);
      else if (!spec.startsWith(".") && !spec.startsWith("@/")) packages.add(spec);
    }
  }
  return { files, packages };
}

test("every employee-mutation entry point exists", () => {
  for (const p of ENTRY_POINTS) assert.ok(existsSync(join(ROOT, p)), p);
});

test("the employee mutation path never imports the SHG data layer", () => {
  const { files } = graph();
  const reached = [...files].map((f) => relative(ROOT, f));
  assert.ok(reached.length > ENTRY_POINTS.length, "import graph resolved");
  for (const file of reached) {
    for (const forbidden of FORBIDDEN_PATHS) assert.ok(!file.startsWith(forbidden), `${file} is SHG code`);
  }
});

test("no file on the employee mutation path references ozey-shg, the SHG reader or the SHG API", () => {
  const { files } = graph();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const pattern of FORBIDDEN_TEXT) assert.ok(!pattern.test(source), `${relative(ROOT, file)} matches ${pattern}`);
  }
});

test("the employee mutation path writes through the Workforce Admin client only", () => {
  const { files } = graph();
  const reached = [...files].map((f) => relative(ROOT, f));
  assert.ok(reached.includes("src/lib/server/workforce-admin.ts"), "uses the Workforce Admin client");
  const admin = readFileSync(join(ROOT, "src/lib/server/workforce-admin.ts"), "utf8");
  assert.match(admin, /WORKFORCE_PROJECT_ID/);
  assert.doesNotMatch(admin, /ozey-shg/);
});
