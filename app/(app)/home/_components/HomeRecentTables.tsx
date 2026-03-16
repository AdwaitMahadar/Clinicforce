"use client";

import { DataTable, InitialsBadge, StatusBadge } from "@/components/common";
import type { ColumnDef } from "@/components/common";

export interface AppointmentRow {
  id:          string;
  time:        string;
  patientName: string;
  visitType:   string;
  status:      string;
}

const appointmentColumns: ColumnDef<AppointmentRow>[] = [
  {
    accessorKey: "time",
    header: "Time",
    cell: ({ row }) => (
      <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
        {row.getValue("time")}
      </span>
    ),
  },
  {
    id: "patient",
    header: "Patient Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <InitialsBadge name={row.original.patientName} size="md" />
        <span className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
          {row.original.patientName}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "visitType",
    header: "Visit Type",
    cell: ({ row }) => (
      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {row.getValue("visitType")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
];

interface HomeRecentTablesProps {
  data: AppointmentRow[];
}

export function HomeRecentTables({ data }: HomeRecentTablesProps) {
  return <DataTable columns={appointmentColumns} data={data} />;
}
