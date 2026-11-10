/** Employee profile routes under /employees/[employeeNumber]. */
export function employeeRoutes(employeeNumber: string) {
  const base = `/employees/${encodeURIComponent(employeeNumber)}`;
  return {
    overview: base,
    edit: `${base}/edit`,
  };
}
