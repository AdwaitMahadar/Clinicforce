import {
  fetchPatientDetailAppointmentsTabCached,
  fetchPatientDetailDocumentsTabCached,
  fetchPatientDetailPrescriptionsTabCached,
} from "@/lib/detail-tab-fetch-cache";

export async function PatientPrefetchDocuments({ patientId }: { patientId: string }) {
  await fetchPatientDetailDocumentsTabCached(patientId);
  return null;
}

export async function PatientPrefetchAppointments({ patientId }: { patientId: string }) {
  await fetchPatientDetailAppointmentsTabCached(patientId);
  return null;
}

export async function PatientPrefetchPrescriptions({ patientId }: { patientId: string }) {
  await fetchPatientDetailPrescriptionsTabCached(patientId);
  return null;
}
