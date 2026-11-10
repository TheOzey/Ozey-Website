import type { ReactNode } from "react";

export interface DetailItem {
  label: string;
  value: ReactNode;
}

export function DetailList({ items, columns = 2 }: { items: DetailItem[]; columns?: 2 | 3 | 4 }) {
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <dl className={`grid grid-cols-1 gap-x-8 gap-y-5 ${grid}`}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium text-muted">{item.label}</dt>
          <dd className="mt-1 truncate text-sm text-foreground tabular">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
