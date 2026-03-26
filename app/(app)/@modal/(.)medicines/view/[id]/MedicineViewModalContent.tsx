import { notFound } from "next/navigation";
import { getMedicineDetail } from "@/lib/actions/medicines";
import { buildMedicineDetail } from "@/app/(app)/medicines/_lib/medicine-detail-mapper";
import { MedicineDetailPanel } from "@/app/(app)/medicines/_components/MedicineDetailPanel";

export async function MedicineViewModalContent({ id }: { id: string }) {
  const result = await getMedicineDetail(id);

  if (!result.success) notFound();

  return <MedicineDetailPanel mode="edit" medicine={buildMedicineDetail(result.data)} />;
}
