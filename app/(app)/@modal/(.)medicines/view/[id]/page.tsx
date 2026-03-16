/**
 * app/(app)/@modal/(.)medicines/view/[id]/page.tsx
 *
 * Intercepting modal — async Server Component.
 * Fetches medicine detail directly. The close button is delegated
 * to ModalCloseButton (a tiny "use client" component).
 */

import { notFound } from "next/navigation";
import { getMedicineDetail } from "@/lib/actions/medicines";
import { MedicineDetailPanel } from "@/app/(app)/medicines/_components/MedicineDetailPanel";
import { ModalShell } from "@/components/common/ModalShell";
import type { MedicineDetail } from "@/types/medicine";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InterceptedMedicineModal({ params }: Props) {
  const { id } = await params;
  const result = await getMedicineDetail(id);

  if (!result.success) notFound();

  const r = result.data;
  const medicine: MedicineDetail = {
    id:                 r.id,
    name:               r.name,
    category:           r.category     ?? "",
    brand:              r.brand        ?? "",
    form:               r.form         ?? "",
    description:        r.description  ?? "",
    lastPrescribedDate: r.lastPrescribedDate
      ? new Date(r.lastPrescribedDate as unknown as string).toISOString().slice(0, 10)
      : "",
    isActive:           r.isActive     ?? true,
    createdAt:          r.createdAt
      ? new Date(r.createdAt as unknown as string).toISOString()
      : "",
    createdBy:          "",
    activityLog:        [],
  };

  return (
    <ModalShell size="xl" label={`Edit: ${medicine.name}`}>
      <MedicineDetailPanel mode="edit" medicine={medicine} />
    </ModalShell>
  );
}
