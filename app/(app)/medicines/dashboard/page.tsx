"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pill, Beaker, Syringe, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DataTable,
  TableFilterBar,
  TablePagination,
} from "@/components/common";
import type { ColumnDef, FilterColumn, ActiveFilter } from "@/components/common";
import {
  MOCK_MEDICINES,
  MOCK_MEDICINES_TOTAL,
  MOCK_MEDICINES_PAGE_SIZE,
} from "@/mock/medicines/dashboard";
import type { MedicineRow, MedicineIcon } from "@/mock/medicines/dashboard";

const getIcon = (iconName: MedicineIcon) => {
  switch (iconName) {
    case "pill": return <Pill size={20} />;
    case "medication_liquid": return <Beaker size={20} />;
    case "vaccines": return <Syringe size={20} />;
    case "prescriptions": return <FileText size={20} />;
    default: return <Pill size={20} />;
  }
};

const medicineColumns: ColumnDef<MedicineRow>[] = [
  {
    id: "medicine",
    header: "Medicine Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-md flex items-center justify-center border"
          style={{
            background: "var(--color-surface-alt)",
            borderColor: "var(--color-border)",
            color: "var(--color-text-muted)"
          }}
        >
          {getIcon(row.original.icon)}
        </div>
        <div>
          <span className="text-sm font-bold block" style={{ color: "var(--color-text-primary)" }}>
            {row.original.name}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            SKU: {row.original.sku}
          </span>
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
    accessorKey: "brand",
    header: "Brand",
    cell: ({ row }) => (
      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
        {row.getValue("brand")}
      </span>
    ),
  },
  {
    accessorKey: "lastUsed",
    header: () => <div className="text-right w-full">Last Used</div>,
    cell: ({ row }) => (
      <div className="text-right text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {row.getValue("lastUsed")}
      </div>
    ),
  },
];

const MEDICINE_FILTER_COLUMNS: FilterColumn[] = [
  {
    key: "category",
    label: "Category",
    type: "select",
    options: [
      { label: "Antibiotics", value: "Antibiotics" },
      { label: "Painkillers", value: "Painkillers" },
      { label: "Diabetes Care", value: "Diabetes Care" },
      { label: "Antihistamines", value: "Antihistamines" },
      { label: "Vitamins", value: "Vitamins" },
      { label: "Cardiovascular", value: "Cardiovascular" },
    ],
  },
  {
    key: "brand",
    label: "Brand",
    type: "select",
    options: [
      { label: "MediLife Pharma", value: "MediLife Pharma" },
      { label: "Pfizer Inc.", value: "Pfizer Inc." },
      { label: "Sanofi", value: "Sanofi" },
      { label: "GlaxoSmithKline", value: "GlaxoSmithKline" },
      { label: "Zyrtec / Johnson & Johnson", value: "Zyrtec / Johnson & Johnson" },
      { label: "AstraZeneca", value: "AstraZeneca" },
    ],
  },
  {
    key: "name",
    label: "Name",
    type: "text",
  },
];

export default function MedicinesDashboardPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [page, setPage] = useState(1);

  const filtered = MOCK_MEDICINES.filter((m) => {
    const fullName = m.name.toLowerCase();
    const skuName = m.sku.toLowerCase();
    
    if (
      search &&
      !fullName.includes(search.toLowerCase()) &&
      !skuName.includes(search.toLowerCase()) &&
      !m.category.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }

    for (const f of activeFilters) {
      if (!f.value) continue;

      if (f.columnKey === "category" && m.category !== f.value) return false;
      if (f.columnKey === "brand" && m.brand !== f.value) return false;
      if (f.columnKey === "name") {
        const query = f.value.toLowerCase();
        if (!fullName.includes(query) && !skuName.includes(query)) return false;
      }
    }

    return true;
  });

  return (
    <div className="p-8 h-full flex flex-col gap-5">
      <PageHeader
        title="Medicine Inventory"
        subtitle="Manage stock, track brands, and usage history."
        actions={
          <Button
            className="gap-2 shadow-sm"
            style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
            onClick={() => router.push("/medicines/new")}
          >
            <Plus size={15} />
            Add Medicine
          </Button>
        }
      />

      <TableFilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search inventory by name, SKU or category..."
        filterColumns={MEDICINE_FILTER_COLUMNS}
        activeFilters={activeFilters}
        onFiltersChange={(f) => { setActiveFilters(f); setPage(1); }}
        onExport={() => console.log("export medicines")}
      />

      <div className="flex-1 min-h-0">
        <DataTable
          columns={medicineColumns}
          data={filtered}
          enableSorting
          onRowClick={(row) => router.push(`/medicines/view/${row.id}`)}
          emptyState={
            <div className="flex flex-col items-center gap-2 py-10">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                No medicines match your filters.
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Try adjusting your search or removing a filter.
              </p>
            </div>
          }
        />
      </div>

      <TablePagination
        page={page}
        totalRows={MOCK_MEDICINES_TOTAL}
        pageSize={MOCK_MEDICINES_PAGE_SIZE}
        onPageChange={setPage}
        entityLabel="medicine"
      />
    </div>
  );
}
