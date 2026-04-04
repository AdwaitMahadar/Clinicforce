import { notFound } from "next/navigation";
import { getPatientDetail } from "@/lib/actions/patients";
import { buildPatientDetail } from "@/app/(app)/patients/_lib/patient-detail-mapper";
import { PatientViewModalClient } from "./PatientViewModalClient";

export async function PatientViewModalContent({ id }: { id: string }) {
  const result = await getPatientDetail(id);

  if (!result.success) notFound();

  return <PatientViewModalClient patient={buildPatientDetail(result.data)} />;
}
