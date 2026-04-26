/**
 * app/(app)/patients/view/[id]/page.tsx
 *
 * Full-page fallback for patient detail.
 * Shown on direct URL access / hard refresh of /patients/view/[id].
 * During normal in-app row-click navigation, the intercepting modal takes over.
 */

import { notFound } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { loadPatientDetailViewData } from "../../_lib/patient-detail-view-data";
import { DetailPageShell } from "@/components/layout/DetailPageShell";
import { PatientDetailPanel } from "../../_components/PatientDetailPanel";
import { PatientDetailPrefetchGroup } from "../../_components/detail-tabs/patient-detail-prefetch-group";
import {
  PatientAppointmentsTabLoader,
  PatientDocumentsTabLoader,
  PatientPrescriptionsTabLoader,
} from "../../_components/detail-tabs/patient-detail-tab-loaders";

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params;
  const [session, payload] = await Promise.all([getSession(), loadPatientDetailViewData(id)]);

  if (!payload) notFound();

  const { patient } = payload;
  const showPrescriptionsTab = hasPermission(session.user.type, "viewPrescriptions");

  return (
    <DetailPageShell breadcrumb={`Patients › ${patient.firstName} ${patient.lastName}`}>
      <>
        <PatientDetailPrefetchGroup patientId={id} />
        <PatientDetailPanel
          mode="view"
          patient={patient}
          documentsTab={<PatientDocumentsTabLoader patientId={id} />}
          appointmentsTab={<PatientAppointmentsTabLoader patientId={id} />}
          prescriptionsTab={
            showPrescriptionsTab ? <PatientPrescriptionsTabLoader patientId={id} /> : undefined
          }
        />
      </>
    </DetailPageShell>
  );
}
