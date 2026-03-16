"use client";

import { DataTable, StatusBadge } from "@/components/common";
import type { ColumnDef } from "@/components/common";
import type { MedicineRow } from "@/types/medicine";

const medicineColumns: ColumnDef<MedicineRow>[] = [
  {
    accessorKey: "name",
    header: "Medicine",
    cell: ({ row }) => (
      <div className="min-w-[180px]">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {row.original.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {row.original.brand}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {row.getValue("category")}
      </span>
    ),
  },
  {
    accessorKey: "lastUsed",
    header: "Last Prescribed",
    cell: ({ row }) => (
      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {row.getValue("lastUsed")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
];

interface MedicinesTableProps {
  data: MedicineRow[];
}

export function MedicinesTable({ data }: MedicinesTableProps) {
  return (
    <DataTable
      columns={medicineColumns}
      data={data}
      enableSorting
      emptyState={
        <div className="flex flex-col items-center gap-2 py-10">
          <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
            No medicines match your filters.
          </p>
        </div>
      }
    />
  );
}
