import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PatientsDashboardPage() {
  return (
    <div className="p-8">
      <PageHeader
        title="Patients Directory"
        subtitle="Manage patient records, history, and active treatments."
        actions={<Button className="gap-2" style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}><Plus size={15} /> New Patient</Button>}
      />
      <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
        <p className="text-sm">Patients DataTable — coming in Phase 3</p>
      </div>
    </div>
  );
}
