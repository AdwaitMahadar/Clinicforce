/**
 * app/(app)/medicines/view/[id]/page.tsx
 *
 * Full-page fallback for medicine detail.
 * Shown on direct URL access / hard refresh of /medicines/view/[id].
 * During normal in-app navigation the intercepting modal takes over.
 */

import { notFound } from "next/navigation";
import { getMedicineDetail } from "@/lib/actions/medicines";
import { MedicineDetailPanel } from "../../_components/MedicineDetailPanel";
import type { MedicineDetail } from "@/types/medicine";

interface MedicineDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MedicineDetailPage({ params }: MedicineDetailPageProps) {
  const { id } = await params;
  const result = await getMedicineDetail(id);

  if (!result.success) notFound();

  // Map server action data shape → MedicineDetail shape the panel expects
  const r = result.data;
  const medicine: MedicineDetail = {
    id:                 r.id,
    name:               r.name,
    category:           r.category ?? "",
    brand:              r.brand ?? "",
    form:               r.form ?? "",
    description:        r.description ?? "",
    lastPrescribedDate: r.lastPrescribedDate
      ? new Date(r.lastPrescribedDate).toISOString().slice(0, 10)
      : "",
    isActive:  r.isActive,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
    createdBy: "",
    // TODO: Implement when audit_log table is built.
    activityLog: [],
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <p
        className="text-xs font-medium mb-6"
        style={{ color: "var(--color-text-muted)" }}
      >
        Medicines › {medicine.name}
      </p>

      <div
        className="flex-1 rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-glass-fill-data)",
          border:     "1px solid var(--color-border)",
          boxShadow:  "var(--shadow-card)",
        }}
      >
        <MedicineDetailPanel mode="edit" medicine={medicine} />
      </div>
    </div>
  );
}
