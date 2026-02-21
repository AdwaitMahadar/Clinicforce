import { PageHeader } from "@/components/layout/PageHeader";

export default function AppointmentsReportsPage() {
  return (
    <div className="p-8">
      <PageHeader title="Appointments Reports" subtitle="Appointment analytics and performance metrics." />
      <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
        <p className="text-sm">Reports — coming in Phase 3</p>
      </div>
    </div>
  );
}
