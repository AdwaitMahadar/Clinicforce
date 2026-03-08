/**
 * app/(app)/medicines/[id]/page.tsx
 *
 * Full-page fallback for medicine detail.
 *
 * This page is shown when:
 *   - The user navigates directly to /medicines/[id] (e.g. types URL, refreshes)
 *   - The intercepting modal is NOT active (no client-side navigation from the table)
 *
 * When accessed via client-side row-click from the dashboard, the @modal parallel
 * route intercepts and shows the dialog instead — this page stays dormant.
 *
 * Layout: centred card in the main content area (not a full-screen takeover).
 */

import { notFound } from "next/navigation";
import { getMockMedicineDetail } from "@/mock/medicines/detail";
import { MedicineDetailPanel } from "../_components/MedicineDetailPanel";

interface MedicineDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MedicineDetailPage({ params }: MedicineDetailPageProps) {
  const { id } = await params;
  const medicine = getMockMedicineDetail(id);

  if (!medicine) notFound();

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Page-level title breadcrumb */}
      <p
        className="text-xs font-medium mb-6"
        style={{ color: "var(--color-text-muted)" }}
      >
        Medicines › {medicine.name}
      </p>

      {/* Detail card */}
      <div
        className="flex-1 rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-glass-fill-data)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <MedicineDetailPanel mode="edit" medicine={medicine} />
      </div>
    </div>
  );
}
