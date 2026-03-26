/**
 * app/(app)/medicines/view/[id]/page.tsx
 *
 * Full-page fallback for medicine detail.
 * Shown on direct URL access / hard refresh of /medicines/view/[id].
 * During normal in-app navigation the intercepting modal takes over.
 */

import { notFound } from "next/navigation";
import { getMedicineDetail } from "@/lib/actions/medicines";
import { buildMedicineDetail } from "../../_lib/medicine-detail-mapper";
import { MedicineDetailPanel } from "../../_components/MedicineDetailPanel";

interface MedicineDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MedicineDetailPage({ params }: MedicineDetailPageProps) {
  const { id } = await params;
  const result = await getMedicineDetail(id);

  if (!result.success) notFound();

  const medicine = buildMedicineDetail(result.data);

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="max-w-[1700px] mx-auto w-full flex-1 min-h-0 flex flex-col">
        <p
          className="text-xs font-medium mb-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          Medicines › {medicine.name}
        </p>

        <div
          className="flex-1 rounded-2xl overflow-hidden min-h-0"
          style={{
            background: "var(--color-glass-fill-data)",
            border:     "1px solid var(--color-border)",
            boxShadow:  "var(--shadow-card)",
          }}
        >
          <MedicineDetailPanel mode="edit" medicine={medicine} />
        </div>
      </div>
    </div>
  );
}
