"use client";

import { Alert, AlertDialog, Button, Dropdown, Label } from "@heroui/react";
import { Ellipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Per-row Edit / Delete for the Employees directory. Rendered only for users
 * with console:employees.manage; the API enforces the same permission, so
 * hiding the menu is a convenience, not the control.
 *
 * Delete offboards the employee (the schema's terminal state): the record and
 * its employee ID are kept for the audit history, sign-in is refused and
 * their sessions end immediately.
 */
export function EmployeeActions({
  employeeNumber,
  displayName,
  isSelf,
}: {
  employeeNumber: string | null;
  displayName: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!employeeNumber) {
    return (
      <span className="text-xs text-muted" title="Employee IDs are assigned by the one-time employee-number migration">
        Needs employee ID
      </span>
    );
  }

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/dashboard/api/employees/${encodeURIComponent(employeeNumber!)}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) {
        setConfirming(false);
        router.refresh();
        return;
      }
      setError(
        body.message ??
          ({ 401: "Your session has ended. Sign in again, then retry.", 403: "You don't have permission to delete employees.", 404: "This employee no longer exists.", 409: "This employee has already been deleted." } as Record<number, string>)[res.status] ??
          "The employee could not be deleted. Nothing was changed; try again.",
      );
    } catch {
      setError("The Console could not be reached. Nothing was changed; try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dropdown>
        <Button variant="ghost" size="sm" isIconOnly aria-label={`Actions for ${displayName}`} data-action="employee-actions">
          <Ellipsis className="size-4" aria-hidden />
        </Button>
        <Dropdown.Popover placement="bottom end" className="min-w-40">
          <Dropdown.Menu
            onAction={(key) => {
              if (key === "view") router.push(`/employees/${encodeURIComponent(employeeNumber)}`);
              if (key === "edit") router.push(`/employees/${encodeURIComponent(employeeNumber)}/edit`);
              if (key === "delete") {
                setError(null);
                setConfirming(true);
              }
            }}
          >
            <Dropdown.Item id="view" textValue="View">
              <Label>View</Label>
            </Dropdown.Item>
            <Dropdown.Item id="edit" textValue="Edit">
              <Label>Edit</Label>
            </Dropdown.Item>
            {isSelf ? null : (
              <Dropdown.Item id="delete" textValue="Delete" variant="danger">
                <Label>Delete</Label>
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <AlertDialog.Backdrop isOpen={confirming} onOpenChange={(open) => !deleting && setConfirming(open)}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete employee?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="text-sm text-foreground">
                <span className="font-semibold">{displayName}</span> · <span className="font-mono">{employeeNumber}</span>
              </p>
              <p className="mt-2 text-sm text-muted">
                This removes their Ozey Console employee record from the directory. They can no longer sign in, and any active
                session ends now. The record and its employee ID are kept for the audit history; the ID will never be given to
                anyone else.
              </p>
              {error ? (
                <Alert status="danger" className="mt-3">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="tertiary" onPress={() => setConfirming(false)} isDisabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onPress={remove} isPending={deleting} isDisabled={deleting} data-action="confirm-delete">
                {deleting ? "Deleting…" : "Delete employee"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
