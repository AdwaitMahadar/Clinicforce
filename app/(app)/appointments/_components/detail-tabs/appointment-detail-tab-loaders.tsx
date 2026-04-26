import {
  fetchAppointmentDetailAppointmentsTabCached,
  fetchAppointmentDetailDocumentsTabCached,
  fetchAppointmentDetailPrescriptionsTabCached,
} from "@/lib/detail-tab-fetch-cache";
import {
  mapAppointmentSummaryRowsToPatientAppointments,
  mapDocumentSummariesToPatientDocuments,
  mapServerPrescriptionSummariesToPatientUi,
} from "@/lib/detail-tab-ui-mappers";
import {
  AppointmentListTab,
  DocumentsTab,
  PrescriptionsTab,
} from "@/components/common";

export async function AppointmentDocumentsTabLoader({
  appointmentId,
  patientId,
}: {
  appointmentId: string;
  patientId: string;
}) {
  const res = await fetchAppointmentDetailDocumentsTabCached(appointmentId);
  const documents = res.success ? mapDocumentSummariesToPatientDocuments(res.data) : [];
  return (
    <DocumentsTab
      documents={documents}
      patientId={patientId}
      appointmentId={appointmentId}
      emptyMessage="No documents for this patient yet."
    />
  );
}

export async function AppointmentAppointmentsTabLoader({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const res = await fetchAppointmentDetailAppointmentsTabCached(appointmentId);
  const appointments = res.success
    ? mapAppointmentSummaryRowsToPatientAppointments(res.data)
    : [];
  return (
    <AppointmentListTab
      appointments={appointments}
      currentAppointmentId={appointmentId}
      emptyMessage="No other appointments for this patient."
    />
  );
}

export async function AppointmentPrescriptionsTabLoader({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const res = await fetchAppointmentDetailPrescriptionsTabCached(appointmentId);
  const initialPrescription = res.success ? res.data.prescription : null;
  const initialPrescriptionHistory = res.success
    ? mapServerPrescriptionSummariesToPatientUi(res.data.prescriptionHistory)
    : [];
  return (
    <PrescriptionsTab
      appointmentId={appointmentId}
      currentAppointmentId={appointmentId}
      initialPrescription={initialPrescription}
      initialPrescriptionHistory={initialPrescriptionHistory}
    />
  );
}
