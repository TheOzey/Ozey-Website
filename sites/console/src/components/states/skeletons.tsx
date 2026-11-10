import { Skeleton } from "@heroui/react";

export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-border" aria-busy aria-label="Loading">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-6 px-4 py-3.5">
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton key={col} className={`h-3.5 rounded-md ${col === 0 ? "w-48" : "w-24"} ${col > 2 ? "hidden md:block" : ""}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function BlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3" aria-busy aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3.5 rounded-md ${i % 2 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}
