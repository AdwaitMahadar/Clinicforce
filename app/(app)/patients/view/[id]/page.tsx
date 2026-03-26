/**
 * app/(app)/patients/view/[id]/page.tsx
 *
 * Full-page fallback for patient detail.
 * Shown on direct URL access / hard refresh of /patients/view/[id].
 * During normal in-app row-click navigation, the intercepting modal takes over.
 */

import { notFound } from "next/navigation";
import { getPatientDetail } from "@/lib/actions/patients";
import { buildPatientDetail } from "../../_lib/patient-detail-mapper";
import { DetailPageShell } from "@/components/layout/DetailPageShell";
import { PatientDetailPanel } from "../../_components/PatientDetailPanel";

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params;
  const result = await getPatientDetail(id);

  if (!result.success) notFound();

  const patient = buildPatientDetail(result.data);

  return (
    <DetailPageShell breadcrumb={`Patients › ${patient.firstName} ${patient.lastName}`}>
      <PatientDetailPanel mode="view" patient={patient} />
    </DetailPageShell>
  );
}
