import { PageHeader } from "@/components/layout/PageHeader";

export default function PatientsReportsPage() {
  return (
    <div className="p-8">
      <PageHeader title="Patients Reports" subtitle="Patient demographics and clinical trends." />
      <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
        <p className="text-sm">Reports — coming in Phase 3</p>
      </div>
    </div>
  );
}
