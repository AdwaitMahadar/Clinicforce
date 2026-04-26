import { notFound } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { loadPatientDetailViewData } from "@/app/(app)/patients/_lib/patient-detail-view-data";
import { PatientViewModalClient } from "./PatientViewModalClient";
import { PatientDetailPrefetchGroup } from "@/app/(app)/patients/_components/detail-tabs/patient-detail-prefetch-group";
import {
  PatientAppointmentsTabLoader,
  PatientDocumentsTabLoader,
  PatientPrescriptionsTabLoader,
} from "@/app/(app)/patients/_components/detail-tabs/patient-detail-tab-loaders";

export async function PatientViewModalContent({ id }: { id: string }) {
  const [session, payload] = await Promise.all([getSession(), loadPatientDetailViewData(id)]);

  if (!payload) notFound();

  const { patient } = payload;
  const showPrescriptionsTab = hasPermission(session.user.type, "viewPrescriptions");

  return (
    <>
      <PatientDetailPrefetchGroup patientId={id} />
      <PatientViewModalClient
        patient={patient}
        documentsTab={<PatientDocumentsTabLoader patientId={id} />}
        appointmentsTab={<PatientAppointmentsTabLoader patientId={id} />}
        prescriptionsTab={
          showPrescriptionsTab ? <PatientPrescriptionsTabLoader patientId={id} /> : undefined
        }
      />
    </>
  );
}
