import {
  fetchPatientDetailAppointmentsTabCached,
  fetchPatientDetailDocumentsTabCached,
  fetchPatientDetailPrescriptionsTabCached,
} from "@/lib/detail-tab-fetch-cache";
import {
  mapAppointmentSummaryRowsToPatientAppointments,
  mapDocumentSummariesToPatientDocuments,
  mapServerPrescriptionSummariesToPatientUi,
} from "@/lib/detail-tab-ui-mappers";
import { AppointmentListTab, DocumentsTab, PatientPrescriptionsTab } from "@/components/common";

export async function PatientDocumentsTabLoader({ patientId }: { patientId: string }) {
  const res = await fetchPatientDetailDocumentsTabCached(patientId);
  const documents = res.success ? mapDocumentSummariesToPatientDocuments(res.data) : [];
  return (
    <DocumentsTab
      documents={documents}
      patientId={patientId}
      emptyMessage="No documents uploaded yet."
    />
  );
}

export async function PatientAppointmentsTabLoader({ patientId }: { patientId: string }) {
  const res = await fetchPatientDetailAppointmentsTabCached(patientId);
  const appointments = res.success
    ? mapAppointmentSummaryRowsToPatientAppointments(res.data)
    : [];
  return (
    <AppointmentListTab
      appointments={appointments}
      emptyMessage="No appointments recorded."
    />
  );
}

export async function PatientPrescriptionsTabLoader({ patientId }: { patientId: string }) {
  const res = await fetchPatientDetailPrescriptionsTabCached(patientId);
  const initialPrescriptions = res.success
    ? mapServerPrescriptionSummariesToPatientUi(res.data)
    : [];
  return (
    <PatientPrescriptionsTab patientId={patientId} initialPrescriptions={initialPrescriptions} />
  );
}
