"use client";

import { Alert, AlertDialog, Button, Dropdown, Label } from "@heroui/react";
import { Ellipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PartnerStatus } from "@/lib/partners/model";

/**
 * Per-row actions for the Partners directory. Shown only when the user can
 * manage partners; the API enforces console:partners.manage.
 */
export function PartnerActions({
  partnerNumber,
  displayName,
  status,
}: {
  partnerNumber: string;
  displayName: string;
  status: PartnerStatus;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDeactivate = status === "active";

  async function deactivate() {
    if (deactivating) return;
    setDeactivating(true);
    setError(null);
    try {
      const res = await fetch(`/dashboard/api/partners/${encodeURIComponent(partnerNumber)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) {
        setConfirming(false);
        router.refresh();
        return;
      }
      setError(
        body.message ??
          ({
            401: "Your session has ended. Sign in again, then retry.",
            403: "You don't have permission to manage partners.",
            404: "This partner no longer exists.",
            409: "This partner has been terminated and can no longer be changed.",
          } as Record<number, string>)[res.status] ??
          "The partner could not be deactivated. Nothing was changed; try again.",
      );
    } catch {
      setError("The Console could not be reached. Nothing was changed; try again.");
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <>
      <Dropdown>
        <Button variant="ghost" size="sm" isIconOnly aria-label={`Actions for ${displayName}`} data-action="partner-actions">
          <Ellipsis className="size-4" aria-hidden />
        </Button>
        <Dropdown.Popover placement="bottom end" className="min-w-40">
          <Dropdown.Menu
            onAction={(key) => {
              if (key === "view") router.push(`/partners/${encodeURIComponent(partnerNumber)}`);
              if (key === "edit") router.push(`/partners/${encodeURIComponent(partnerNumber)}/edit`);
              if (key === "deactivate") {
                setError(null);
                setConfirming(true);
              }
            }}
          >
            <Dropdown.Item id="view" textValue="View">
              <Label>View</Label>
            </Dropdown.Item>
            {status !== "terminated" ? (
              <Dropdown.Item id="edit" textValue="Edit">
                <Label>Edit</Label>
              </Dropdown.Item>
            ) : null}
            {canDeactivate ? (
              <Dropdown.Item id="deactivate" textValue="Deactivate" variant="danger">
                <Label>Deactivate</Label>
              </Dropdown.Item>
            ) : null}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <AlertDialog.Backdrop isOpen={confirming} onOpenChange={(open) => !deactivating && setConfirming(open)}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Deactivate partner?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="text-sm text-foreground">
                <span className="font-semibold">{displayName}</span> · <span className="font-mono">{partnerNumber}</span>
              </p>
              <p className="mt-2 text-sm text-muted">
                The partner will be marked inactive. Their Partner ID is kept on record and is never reused. Attribution
                and commission views stay available for audit.
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
              <Button variant="tertiary" onPress={() => setConfirming(false)} isDisabled={deactivating}>
                Cancel
              </Button>
              <Button variant="danger" onPress={deactivate} isPending={deactivating} isDisabled={deactivating} data-action="confirm-deactivate">
                {deactivating ? "Deactivating…" : "Deactivate partner"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
