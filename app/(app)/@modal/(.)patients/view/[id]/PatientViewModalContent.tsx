import { notFound } from "next/navigation";
import { getPatientDetail } from "@/lib/actions/patients";
import { buildPatientDetail } from "@/app/(app)/patients/_lib/patient-detail-mapper";
import { PatientDetailPanel } from "@/app/(app)/patients/_components/PatientDetailPanel";

export async function PatientViewModalContent({ id }: { id: string }) {
  const result = await getPatientDetail(id);

  if (!result.success) notFound();

  return <PatientDetailPanel mode="view" patient={buildPatientDetail(result.data)} />;
}
