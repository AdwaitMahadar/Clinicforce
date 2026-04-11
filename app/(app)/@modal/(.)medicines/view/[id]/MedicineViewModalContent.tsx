import { notFound } from "next/navigation";
import { getMedicineDetail } from "@/lib/actions/medicines";
import { buildMedicineDetail } from "@/app/(app)/medicines/_lib/medicine-detail-mapper";
import { MedicineViewModalClient } from "./MedicineViewModalClient";

export async function MedicineViewModalContent({ id }: { id: string }) {
  const result = await getMedicineDetail(id);

  if (!result.success) notFound();

  return <MedicineViewModalClient medicine={buildMedicineDetail(result.data)} />;
}
