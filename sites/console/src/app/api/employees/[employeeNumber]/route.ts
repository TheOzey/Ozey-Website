import type { NextRequest } from "next/server";
import { validateNewEmployee } from "@/lib/employees/new-employee";
import {
  DuplicateEmployeeEmailError,
  EmployeeNotFoundError,
  EmployeeOffboardedError,
  offboardEmployee,
  SelfLockoutError,
  UnknownRoleError,
  updateEmployee,
} from "@/lib/server/employee-admin";
import { authorizeEmployeeMutation, EMPLOYEE_NUMBER_PARAM, employeeJson as json } from "@/lib/server/employee-api";

type Context = { params: Promise<{ employeeNumber: string }> };

function failure(error: unknown, action: string) {
  if (error instanceof EmployeeNotFoundError) return json(404, { error: "not-found" });
  if (error instanceof EmployeeOffboardedError) return json(409, { error: "employee-deleted" });
  if (error instanceof SelfLockoutError) return json(400, { error: "self-lockout", message: error.message });
  if (error instanceof DuplicateEmployeeEmailError) {
    return json(409, { error: "duplicate-email", fields: { email: "An employee with this email already exists." } });
  }
  if (error instanceof UnknownRoleError) {
    return json(400, { error: "unknown-role", fields: { roles: "That role no longer exists. Reload the page and choose again." } });
  }
  console.error(`employee ${action} failed`, (error as Error).name);
  return json(500, { error: "unavailable" });
}

/**
 * PATCH /api/employees/EMP-0001 — edit names, email, roles and address. The
 * employee number, document id, createdAt and createdBy are never writable
 * (they are not part of the validated input). Same validation as creation.
 */
export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await authorizeEmployeeMutation(request);
  if (!auth.ok) return auth.response;
  const { employeeNumber } = await params;
  if (!EMPLOYEE_NUMBER_PARAM.test(employeeNumber)) return json(404, { error: "not-found" });

  const result = validateNewEmployee(await request.json().catch(() => null));
  if (!result.ok) return json(400, { error: "invalid", fields: result.errors });
  try {
    const { employee, changed, reinvited } = await updateEmployee(employeeNumber, result.value, auth.actor);
    return json(200, { employee, changed, reinvited });
  } catch (error) {
    return failure(error, "update");
  }
}

/**
 * DELETE /api/employees/EMP-0001 — offboard (the schema's terminal state). The
 * record and its number are kept, sign-in is refused and sessions are revoked.
 */
export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await authorizeEmployeeMutation(request);
  if (!auth.ok) return auth.response;
  const { employeeNumber } = await params;
  if (!EMPLOYEE_NUMBER_PARAM.test(employeeNumber)) return json(404, { error: "not-found" });
  try {
    return json(200, { employee: await offboardEmployee(employeeNumber, auth.actor) });
  } catch (error) {
    return failure(error, "delete");
  }
}
