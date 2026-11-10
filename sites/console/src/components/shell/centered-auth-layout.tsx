import type { ReactNode } from "react";
import { OzeyMark } from "@/components/brand/ozey-mark";

export function CenteredAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <OzeyMark subtitle="Console" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
