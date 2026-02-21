"use client";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  StatCard,
  DataTable,
  EventLog,
  InitialsBadge,
  StatusBadge,
} from "@/components/common";
import type { ColumnDef } from "@/components/common";
import {
  MOCK_STAT_CARDS,
  MOCK_APPOINTMENTS,
  MOCK_ACTIVITY,
} from "@/mock/home/dashboard";
import type { AppointmentRow } from "@/mock/home/dashboard";

// ─── Column definitions — headers and cells fully owned by this page ──────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomeDashboardPage() {
  return (
    <div className="p-8 h-full">
      <div className="max-w-[1600px] mx-auto">

        {/* Header */}
        <PageHeader
          title="Dashboard"
          subtitle="Welcome back, here's your clinic overview for today."
          actions={
            <Button style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }} className="gap-2 shadow-sm">
              + New Appt
            </Button>
          }
        />

        {/* Stat cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {MOCK_STAT_CARDS.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </section>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Schedule table */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                Today&apos;s Schedule
              </h2>
              <button className="text-sm font-medium hover:underline" style={{ color: "var(--color-text-secondary)" }}>
                View Calendar
              </button>
            </div>
            <DataTable columns={appointmentColumns} data={MOCK_APPOINTMENTS} />
          </section>

          {/* Activity log */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                Recent Activity
              </h2>
            </div>
            <EventLog events={MOCK_ACTIVITY} />
          </section>

        </div>
      </div>
    </div>
  );
}
