/**
 * app/(app)/medicines/view/[id]/page.tsx
 *
 * Full-page fallback for medicine detail.
 * Shown on direct URL access / hard refresh of /medicines/view/[id].
 * During normal in-app navigation the intercepting modal takes over.
 */

import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { getMedicineDetail } from "@/lib/actions/medicines";
import { buildMedicineDetail } from "../../_lib/medicine-detail-mapper";
import { DetailPageShell } from "@/components/layout/DetailPageShell";
import { MedicineDetailPanel } from "../../_components/MedicineDetailPanel";

interface MedicineDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MedicineDetailPage({ params }: MedicineDetailPageProps) {
  await requirePermission("viewMedicines");

  const { id } = await params;
  const result = await getMedicineDetail(id);

  if (!result.success) notFound();

  const medicine = buildMedicineDetail(result.data);

  return (
    <DetailPageShell breadcrumb={`Medicines › ${medicine.name}`}>
      <MedicineDetailPanel mode="edit" medicine={medicine} />
    </DetailPageShell>
  );
}
