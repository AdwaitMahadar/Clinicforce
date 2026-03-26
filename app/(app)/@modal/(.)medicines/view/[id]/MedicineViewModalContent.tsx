import { notFound } from "next/navigation";
import { getMedicineDetail } from "@/lib/actions/medicines";
import { MedicineDetailPanel } from "@/app/(app)/medicines/_components/MedicineDetailPanel";
import type { MedicineDetail } from "@/types/medicine";

export async function MedicineViewModalContent({ id }: { id: string }) {
  const result = await getMedicineDetail(id);

  if (!result.success) notFound();

  const r = result.data;
  const medicine: MedicineDetail = {
    id: r.id,
    name: r.name,
    category: r.category ?? "",
    brand: r.brand ?? "",
    form: r.form ?? "",
    description: r.description ?? "",
    lastPrescribedDate: r.lastPrescribedDate
      ? new Date(r.lastPrescribedDate as unknown as string).toISOString().slice(0, 10)
      : "",
    isActive: r.isActive ?? true,
    createdAt: r.createdAt
      ? new Date(r.createdAt as unknown as string).toISOString()
      : "",
    createdBy: "",
    activityLog: [],
  };

  return <MedicineDetailPanel mode="edit" medicine={medicine} />;
}
