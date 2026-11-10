"use client";

import { Pagination, Spinner, Table } from "@heroui/react";
import { SearchX, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { DataErrorAlert } from "@/components/states/data-error";
import { EmptyBlock } from "@/components/states/empty-block";
import { TableSkeleton } from "@/components/states/skeletons";

export interface DataColumn<T> {
  id: string;
  label: string;
  render: (item: T) => ReactNode;
  isRowHeader?: boolean;
  align?: "start" | "end";
  /** Hide below the md breakpoint to keep tables readable on small screens. */
  hideOnMobile?: boolean;
}

export interface Pager {
  pageNumber: number;
  hasPrevious: boolean;
  hasNext: boolean;
  goPrevious: () => void;
  goNext: () => void;
}

export interface EmptyCopy {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
}

export function DataTable<T>({
  label,
  columns,
  items,
  getKey,
  getHref,
  isPending,
  isFetching,
  error,
  onRetry,
  empty,
  isFiltered,
  pager,
  minWidth = 720,
  dependencies = [],
}: {
  label: string;
  columns: DataColumn<T>[];
  items: T[];
  getKey: (item: T) => string;
  getHref?: (item: T) => string;
  isPending: boolean;
  isFetching?: boolean;
  error: unknown;
  onRetry?: () => void;
  empty: EmptyCopy;
  /** When true, an empty result is described as "no matches" rather than "no data". */
  isFiltered?: boolean;
  pager?: Pager;
  minWidth?: number;
  /**
   * Values the cell renderers read from outside the row item (e.g. a
   * group-name lookup). React Aria caches rendered rows per item, so
   * without this, cells would not update when those values change.
   */
  dependencies?: readonly unknown[];
}) {
  if (error) {
    return (
      <div className="p-4">
        <DataErrorAlert error={error} onRetry={onRetry} />
      </div>
    );
  }
  if (isPending) return <TableSkeleton columns={Math.min(columns.length, 6)} />;

  const alignClass = (column: DataColumn<T>) =>
    `whitespace-nowrap ${column.align === "end" ? "text-end" : ""} ${column.hideOnMobile ? "hidden md:table-cell" : ""}`;

  return (
    <Table variant="secondary" className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <Table.ScrollContainer>
        <Table.Content aria-label={label} style={{ minWidth }}>
          <Table.Header columns={columns}>
            {(column) => (
              <Table.Column id={column.id} isRowHeader={column.isRowHeader} className={alignClass(column)}>
                {column.label}
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body
            items={items.map((item) => ({ key: getKey(item), item }))}
            dependencies={[columns, ...dependencies]}
            renderEmptyState={() =>
              isFiltered ? (
                <EmptyBlock icon={SearchX} title="No matching results" description="Try a different search or clear the filters." />
              ) : (
                <EmptyBlock icon={empty.icon} title={empty.title} description={empty.description} />
              )
            }
          >
            {(row) => (
              <Table.Row id={row.key} href={getHref?.(row.item)} className={getHref ? "cursor-pointer" : undefined}>
                <Table.Collection items={columns} dependencies={[row.item, ...dependencies]}>
                  {(column) => <Table.Cell className={alignClass(column)}>{column.render(row.item)}</Table.Cell>}
                </Table.Collection>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
      {pager && (pager.hasNext || pager.hasPrevious) ? (
        <Table.Footer>
          <Pagination size="sm">
            <Pagination.Summary>
              <span className="flex items-center gap-2">
                Page {pager.pageNumber}
                {isFetching ? <Spinner size="sm" /> : null}
              </span>
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous isDisabled={!pager.hasPrevious || isFetching} onPress={pager.goPrevious}>
                  <Pagination.PreviousIcon />
                  Previous
                </Pagination.Previous>
              </Pagination.Item>
              <Pagination.Item>
                <Pagination.Next isDisabled={!pager.hasNext || isFetching} onPress={pager.goNext}>
                  Next
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </Table.Footer>
      ) : null}
    </Table>
  );
}
