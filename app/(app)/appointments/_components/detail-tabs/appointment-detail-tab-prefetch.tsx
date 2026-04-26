import {
  fetchAppointmentDetailAppointmentsTabCached,
  fetchAppointmentDetailDocumentsTabCached,
  fetchAppointmentDetailPrescriptionsTabCached,
} from "@/lib/detail-tab-fetch-cache";

/** Starts documents tab fetch for this request; mount inside `<Suspense>`. */
export async function AppointmentPrefetchDocuments({ appointmentId }: { appointmentId: string }) {
  await fetchAppointmentDetailDocumentsTabCached(appointmentId);
  return null;
}

export async function AppointmentPrefetchAppointments({
  appointmentId,
}: {
  appointmentId: string;
}) {
  await fetchAppointmentDetailAppointmentsTabCached(appointmentId);
  return null;
}

export async function AppointmentPrefetchPrescriptions({
  appointmentId,
}: {
  appointmentId: string;
}) {
  await fetchAppointmentDetailPrescriptionsTabCached(appointmentId);
  return null;
}
