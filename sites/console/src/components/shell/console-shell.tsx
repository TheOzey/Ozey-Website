"use client";

import { Button, Drawer, Separator } from "@heroui/react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { productForPath } from "@/products/registry";
import { HeaderLead } from "./header-back-link";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState({ open: false, pathname });
  // Close the mobile drawer whenever navigation happens.
  if (drawer.open && drawer.pathname !== pathname) setDrawer({ open: false, pathname });

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-surface lg:block">
        <SidebarNav />
      </aside>

      <Drawer.Backdrop isOpen={drawer.open} onOpenChange={(open) => setDrawer({ open, pathname })}>
        <Drawer.Content placement="left" className="w-72 max-w-[85vw]">
          <Drawer.Dialog aria-label="Navigation" className="h-full p-0">
            <SidebarNav />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Open navigation"
            className="lg:hidden"
            onPress={() => setDrawer({ open: true, pathname })}
          >
            <Menu className="size-5" aria-hidden />
          </Button>
          <HeaderLead />
          <div className="flex-1" />
          {/* Product data (SHG) is read-only; Console administration is not. */}
          {productForPath(pathname) ? (
            <>
              <span className="hidden text-xs text-muted sm:inline">Read-only access</span>
              <Separator orientation="vertical" className="mx-2 hidden h-5 sm:block" />
            </>
          ) : null}
          <UserMenu />
        </header>
        {/* Pages lay out their own body (PageContainer) so header bands can run full width. */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
