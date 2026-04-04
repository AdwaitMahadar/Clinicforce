"use client";

import { useRouter } from "next/navigation";
import { DataTable, InitialsBadge, StatusBadge } from "@/components/common";
import type { ColumnDef } from "@/components/common";
import type { PatientRow } from "@/types/patient";
import { formatPatientChartId } from "@/lib/utils/chart-id";

const patientColumns: ColumnDef<PatientRow>[] = [
  {
    id: "patient",
    header: "Patient",
    cell: ({ row }) => (
      <div className="flex items-center gap-5 min-w-[200px]">
        <InitialsBadge name={`${row.original.firstName} ${row.original.lastName}`} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
            {row.original.firstName} {row.original.lastName}
          </p>
          <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {row.original.phone?.trim() ? row.original.phone : "—"}
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
        {formatPatientChartId(row.original.chartId)}
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
    header: "Last Consulted Dr.",
    cell: ({ row }) => (
      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {row.getValue("assignedDoctor")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
];

interface PatientsTableProps {
  data: PatientRow[];
}

export function PatientsTable({ data }: PatientsTableProps) {
  const router = useRouter();

  return (
    <DataTable
      columns={patientColumns}
      data={data}
      enableSorting
      onRowClick={(row) => router.push(`/patients/view/${row.id}`)}
      emptyState={
        <div className="flex flex-col items-center gap-2 py-10">
          <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
            No patients match your filters.
          </p>
        </div>
      }
    />
  );
}
