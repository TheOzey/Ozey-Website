"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/motion/button/base";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/motion/popover";
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
    <Popover side="bottom" align="end" sideOffset={10} panelRadius={12}>
      <PopoverTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Account"
          className="rounded-full p-0"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-default text-[12px] font-semibold text-foreground">
            {initials(displayName)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-64 p-3">
        <div className="border-b border-border px-1 pb-3">
          <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted">{email}</p>
          <p className="mt-2 text-[11px] text-muted">
            {permissions.length ? permissions.join(" · ") : "No permissions"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-9 w-full justify-start rounded-lg px-2 text-sm font-medium text-foreground"
          onClick={() => void signOut()}
        >
          Sign out
        </Button>
      </PopoverContent>
    </Popover>
  );
}
