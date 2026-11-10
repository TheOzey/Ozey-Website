import type { NextRequest } from "next/server";
import { validateNewEmployee } from "@/lib/employees/new-employee";
import { createEmployee, DuplicateEmployeeEmailError, UnknownRoleError } from "@/lib/server/employee-admin";
import { authorizeEmployeeMutation, employeeJson as json } from "@/lib/server/employee-api";

/**
 * POST /api/employees — create an Ozey Console employee (status "invited").
 * Authorization: authorizeEmployeeMutation. Then invalid input → 400; unknown
 * role → 400; duplicate email → 409. Writes only Workforce data; internal
 * errors are logged and answered with a generic 500.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeEmployeeMutation(request);
  if (!auth.ok) return auth.response;

  const result = validateNewEmployee(await request.json().catch(() => null));
  if (!result.ok) return json(400, { error: "invalid", fields: result.errors });

  try {
    return json(201, { employee: await createEmployee(result.value, auth.actor) });
  } catch (error) {
    if (error instanceof DuplicateEmployeeEmailError) {
      return json(409, { error: "duplicate-email", fields: { email: "An employee with this email already exists." } });
    }
    if (error instanceof UnknownRoleError) {
      return json(400, { error: "unknown-role", fields: { roles: "That role no longer exists. Reload the page and choose again." } });
    }
    console.error("employee creation failed", (error as Error).name);
    return json(500, { error: "unavailable" });
  }
}
