/**
 * app/(app)/medicines/view/[id]/page.tsx
 *
 * Full-page fallback for medicine detail.
 * Shown on direct URL access / hard refresh of /medicines/view/[id].
 * During normal in-app navigation the intercepting modal takes over.
 *
 * ROUTING NOTE:
 * Detail routes use /view/[id] (not /[id]) so the intercepting route
 * @modal/(.)medicines/view/[id] never conflicts with static segments
 * like /medicines/dashboard or /medicines/new.
 */

import { notFound } from "next/navigation";
import { getMockMedicineDetail } from "@/mock/medicines/detail";
import { MedicineDetailPanel } from "../../_components/MedicineDetailPanel";

interface MedicineDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MedicineDetailPage({ params }: MedicineDetailPageProps) {
  const { id } = await params;
  const medicine = getMockMedicineDetail(id);

  if (!medicine) notFound();

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
