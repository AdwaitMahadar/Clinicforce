"use client";

import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bandage,
  Bone,
  Dumbbell,
  FlaskConical,
  Gem,
  Link2,
  Pill,
  PillBottle,
  Shield,
  Sparkles,
  Sun,
  Timer,
  Wind,
  Zap,
} from "lucide-react";
import { DataTable, StatusBadge } from "@/components/common";
import type { ColumnDef } from "@/components/common";
import type { MedicineRow } from "@/types/medicine";

/** Category label → Lucide icon (dashboard list only; detail panel uses form-based icons). */
const MEDICINE_CATEGORY_ICONS: Record<string, LucideIcon> = {
  Analgesic: Pill,
  "Anti inflammatory": Bandage,
  Antacid: FlaskConical,
  "Short acting Steroid": Zap,
  "Long acting Steroid": Timer,
  Antibiotics: Shield,
  Calcium: Bone,
  "VIT D3": Sun,
  "VIT B12": PillBottle,
  Multivitamins: Sparkles,
  "Muscle relaxants": Dumbbell,
  Minerals: Gem,
  "Cartilage stimulant": Link2,
  Antihistamines: Wind,
};

function MedicineCategoryLeadingIcon({ category }: { category: string }) {
  const Icon = MEDICINE_CATEGORY_ICONS[category] ?? Pill;
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
      style={{
        background: "var(--color-surface-alt)",
        borderColor: "var(--color-border)",
      }}
    >
      <Icon className="size-4" style={{ color: "var(--color-text-secondary)" }} />
    </div>
  );
}

const medicineColumns: ColumnDef<MedicineRow>[] = [
  {
    accessorKey: "name",
    header: "Medicine",
    cell: ({ row }) => (
      <div className="flex items-center gap-5 min-w-[200px]">
        <MedicineCategoryLeadingIcon category={row.original.category} />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
            {row.original.name}
          </p>
          <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {row.original.brand}
          </p>
        </div>
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
  const router = useRouter();

  return (
    <DataTable
      columns={medicineColumns}
      data={data}
      enableSorting
      onRowClick={(row) => router.push(`/medicines/view/${row.id}`)}
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
