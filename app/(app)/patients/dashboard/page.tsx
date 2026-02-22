"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DataTable,
  InitialsBadge,
  StatusBadge,
  TableFilterBar,
  TablePagination,
} from "@/components/common";
import type { ColumnDef, FilterColumn, ActiveFilter } from "@/components/common";
import {
  MOCK_PATIENTS,
  MOCK_PATIENTS_TOTAL,
  MOCK_PATIENTS_PAGE_SIZE,
} from "@/mock/patients/dashboard";
import type { PatientRow, PatientStatus } from "@/mock/patients/dashboard";

// ─── Column definitions ────────────────────────────────────────────────────────

const patientColumns: ColumnDef<PatientRow>[] = [
  {
    id: "patient",
    header: "Patient",
    cell: ({ row }) => (
      <div className="flex items-center gap-3 min-w-[200px]">
        <InitialsBadge
          name={`${row.original.firstName} ${row.original.lastName}`}
          size="md"
        />
        <div className="min-w-0">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {row.original.firstName} {row.original.lastName}
          </p>
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            {row.original.email}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "chartId",
    header: "Chart ID",
    cell: ({ row }) => (
      <span
        className="font-mono text-xs px-2 py-1 rounded-md whitespace-nowrap"
        style={{
          background: "var(--color-surface-alt)",
          color:      "var(--color-text-secondary)",
          border:     "1px solid var(--color-border)",
        }}
      >
        {row.getValue("chartId")}
      </span>
    ),
  },
  {
    accessorKey: "lastVisit",
    header: "Last Visit",
    cell: ({ row }) => (
      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {row.getValue("lastVisit")}
      </span>
    ),
  },
  {
    accessorKey: "assignedDoctor",
    header: "Assigned Dr.",
    cell: ({ row }) => (
      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {row.getValue("assignedDoctor")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.getValue<PatientStatus>("status")} />
    ),
  },
];

// ─── Filter schema for the Patients table ─────────────────────────────────────
// This is the only domain-specific config — the FilterBar itself is generic.

const PATIENT_FILTER_COLUMNS: FilterColumn[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Active",   value: "active"   },
      { label: "Inactive", value: "inactive" },
      { label: "Critical", value: "critical" },
    ],
  },
  {
    key: "assignedDoctor",
    label: "Assigned Doctor",
    type: "select",
    options: [
      { label: "Dr. Sarah Jenkins", value: "Dr. Sarah Jenkins" },
      { label: "Dr. Alan Grant",    value: "Dr. Alan Grant"    },
      { label: "Dr. Emily Chen",    value: "Dr. Emily Chen"    },
    ],
  },
  {
    key: "name",
    label: "Name",
    type: "text",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientsDashboardPage() {
  const [search,        setSearch]        = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [page,          setPage]          = useState(1);

  // ── Client-side filtering (Phase 3: replace with server-side via nuqs URL params) ──
  const filtered = MOCK_PATIENTS.filter((p) => {
    // Search: name, chartId, phone
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    if (
      search &&
      !fullName.includes(search.toLowerCase()) &&
      !p.chartId.toLowerCase().includes(search.toLowerCase()) &&
      !p.phone.includes(search)
    ) {
      return false;
    }

    // Active filters — every filter row must be satisfied (AND logic)
    for (const f of activeFilters) {
      if (!f.value) continue; // skip empty rows

      if (f.columnKey === "status" && p.status !== f.value) return false;

      if (f.columnKey === "assignedDoctor" && p.assignedDoctor !== f.value) return false;

      if (f.columnKey === "name") {
        const query = f.value.toLowerCase();
        if (!fullName.includes(query)) return false;
      }
    }

    return true;
  });

  return (
    <div className="p-8 h-full flex flex-col gap-5">

      {/* Header */}
      <PageHeader
        title="Patients Directory"
        subtitle="Manage patient records, history, and active treatments."
        actions={
          <Button
            className="gap-2 shadow-sm"
            style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
          >
            <Plus size={15} />
            New Patient
          </Button>
        }
      />

      {/* Search & Filter bar */}
      <TableFilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by name, ID, or phone number..."
        filterColumns={PATIENT_FILTER_COLUMNS}
        activeFilters={activeFilters}
        onFiltersChange={(f) => { setActiveFilters(f); setPage(1); }}
        onExport={() => console.log("export patients")}
      />

      {/* Table */}
      <div className="flex-1 min-h-0">
        <DataTable
          columns={patientColumns}
          data={filtered}
          enableSorting
          emptyState={
            <div className="flex flex-col items-center gap-2 py-10">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                No patients match your filters.
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Try adjusting your search or removing a filter.
              </p>
            </div>
          }
        />
      </div>

      {/* Pagination */}
      <TablePagination
        page={page}
        totalRows={MOCK_PATIENTS_TOTAL}
        pageSize={MOCK_PATIENTS_PAGE_SIZE}
        onPageChange={setPage}
        entityLabel="patient"
      />

    </div>
  );
}
