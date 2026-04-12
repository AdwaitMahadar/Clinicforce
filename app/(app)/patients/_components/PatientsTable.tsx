"use client";

import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { Calendar, Eye, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTable, InitialsBadge, StatusBadge } from "@/components/common";
import type { ColumnDef } from "@/components/common";
import { Button } from "@/components/ui/button";
import type { PatientRow } from "@/types/patient";
import { FOLLOW_UP_WINDOW_DAYS } from "@/lib/constants/appointment";
import { formatPatientChartId } from "@/lib/utils/chart-id";

function visitTypeFromLastVisit(
  lastVisitAt: string | null
): "follow-up-visit" | "first-visit" {
  if (!lastVisitAt) return "first-visit";
  const visit = startOfDay(parseISO(lastVisitAt));
  const today = startOfDay(new Date());
  const daysSince = differenceInCalendarDays(today, visit);
  if (daysSince >= 0 && daysSince <= FOLLOW_UP_WINDOW_DAYS) {
    return "follow-up-visit";
  }
  return "first-visit";
}

function newAppointmentSearchParams(row: PatientRow): string {
  const params = new URLSearchParams();
  params.set("patientId", row.id);
  params.set(
    "patientLabel",
    `${row.firstName} ${row.lastName} (${formatPatientChartId(row.chartId)})`
  );
  params.set("visitType", visitTypeFromLastVisit(row.lastVisitAt));
  if (row.lastVisitCategory) params.set("category", row.lastVisitCategory);
  if (row.lastVisitDoctorId) params.set("doctorId", row.lastVisitDoctorId);
  return params.toString();
}

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
  {
    id: "actions",
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <PatientRowActions row={row.original} />,
  },
];

function PatientRowActions({ row }: { row: PatientRow }) {
  const router = useRouter();
  const iconBtnClass =
    "size-8 shrink-0 transition-colors hover:bg-[var(--color-row-hover)] hover:[color:var(--color-text-primary)]";

  return (
    <div
      className="flex items-center justify-end gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={iconBtnClass}
        style={{ color: "var(--color-text-muted)" }}
        aria-label="View patient"
        onClick={() => router.push(`/patients/view/${row.id}`)}
      >
        <Eye className="size-4" strokeWidth={1.75} />
      </Button>
      {row.status !== "inactive" && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconBtnClass}
          style={{ color: "var(--color-text-muted)" }}
          aria-label="New appointment for patient"
          onClick={() =>
            router.push(`/appointments/new?${newAppointmentSearchParams(row)}`)
          }
        >
          <Calendar className="size-4" strokeWidth={1.75} />
        </Button>
      )}
    </div>
  );
}

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
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
            No patients match your filters.
          </p>
          <Button
            type="button"
            className="gap-2 shadow-sm"
            style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
            onClick={() => router.push("/patients/new")}
          >
            <Plus size={15} />
            New Patient
          </Button>
        </div>
      }
    />
  );
}
