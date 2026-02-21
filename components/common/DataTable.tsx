"use client";

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Re-export ColumnDef so callers only need to import from this file
export type { ColumnDef };

interface DataTableProps<TData> {
  /** Column definitions — fully owned by the parent. */
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  /** Allow clicking column headers to sort. Default: true */
  enableSorting?: boolean;
  /** Shown when data is an empty array. */
  emptyState?: React.ReactNode;
  className?: string;
}

/**
 * Generic, column-definition-driven data table.
 *
 * - Powered by TanStack Table (sorting built-in, filtering/pagination ready)
 * - Uses Shadcn `Table` primitives for consistent styling
 * - Column definitions (including headers) are fully controlled by the parent
 * - All colours come from CSS vars in globals.css — no hardcoded values
 *
 * @example
 * ```tsx
 * const columns: ColumnDef<Patient>[] = [
 *   { accessorKey: "name",   header: "Name" },
 *   { accessorKey: "status", header: "Status",
 *     cell: ({ row }) => <StatusBadge status={row.getValue("status")} /> },
 * ];
 * <DataTable columns={columns} data={patients} />
 * ```
 */
export function DataTable<TData>({
  columns,
  data,
  enableSorting = true,
  emptyState,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(enableSorting && {
      getSortedRowModel: getSortedRowModel(),
      onSortingChange: setSorting,
      state: { sorting },
    }),
  });

  return (
    <div
      className={cn("rounded-xl overflow-hidden", className)}
      style={{
        background: "var(--color-glass-fill-data)",
        border:     "var(--shadow-card-border)",
        boxShadow:  "var(--shadow-card)",
      }}
    >
      <Table>
        {/* ── Header ─────────────────────────────────────────── */}
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow
              key={hg.id}
              style={{
                borderBottom: "1px solid var(--color-border)",
                background:   "var(--color-row-header)",
              }}
            >
              {hg.headers.map((header) => {
                const canSort = enableSorting && header.column.getCanSort();
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider select-none",
                      canSort && "cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
                    )}
                    style={{ color: "var(--color-text-muted)" }}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.isPlaceholder ? null : (
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIcon state={header.column.getIsSorted()} />}
                      </span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        {/* ── Body ───────────────────────────────────────────── */}
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="transition-colors cursor-pointer hover:bg-[var(--color-row-hover)]"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-28 text-center">
                {emptyState ?? (
                  <span style={{ color: "var(--color-text-muted)" }} className="text-sm">
                    No records found.
                  </span>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Internal: sort indicator icon ────────────────────────────────────────────

function SortIcon({ state }: { state: false | "asc" | "desc" }) {
  if (state === "asc")  return <ChevronUp   size={12} className="opacity-70" />;
  if (state === "desc") return <ChevronDown  size={12} className="opacity-70" />;
  return <ChevronsUpDown size={12} className="opacity-30" />;
}
