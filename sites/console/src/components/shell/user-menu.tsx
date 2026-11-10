"use client";

import { Avatar, Button, Dropdown, Header, Label } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useConsoleSession } from "@/lib/auth/session-context";
import { initials } from "@/lib/format";

export function UserMenu() {
  const { displayName, email, permissions } = useConsoleSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  async function signOut() {
    await fetch("/dashboard/api/session", { method: "DELETE", credentials: "same-origin" });
    queryClient.clear();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Dropdown>
      <Button variant="ghost" size="sm" isIconOnly aria-label="Account" className="rounded-full">
        <Avatar size="sm">
          <Avatar.Fallback>{initials(displayName)}</Avatar.Fallback>
        </Avatar>
      </Button>
      <Dropdown.Popover placement="bottom end" className="min-w-64">
        <Dropdown.Menu onAction={(key) => (key === "sign-out" ? void signOut() : undefined)}>
          <Dropdown.Section>
            <Header>
              <span className="block truncate text-sm font-semibold text-foreground">{displayName}</span>
              <span className="block truncate text-xs font-normal text-muted">{email}</span>
              <span className="mt-2 block text-[11px] font-normal text-muted">
                {permissions.length ? permissions.join(" · ") : "No permissions"}
              </span>
            </Header>
          </Dropdown.Section>
          <Dropdown.Item id="sign-out" textValue="Sign out">
            <Label>Sign out</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
