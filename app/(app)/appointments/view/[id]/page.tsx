/**
 * app/(app)/appointments/view/[id]/page.tsx
 *
 * Full-page fallback for appointment detail.
 * Shown on direct URL access / hard refresh of /appointments/view/[id].
 * During normal in-app navigation the intercepting modal takes over.
 */

import { notFound } from "next/navigation";
import {
  getAppointmentDetail,
  getActivePatients,
  getActiveDoctors,
} from "@/lib/actions/appointments";
import { mapAppointmentPickerResults } from "../../_lib/appointment-picker-options";
import { buildAppointmentDetail } from "../../_lib/appointment-detail-mapper";
import { DetailPageShell } from "@/components/layout/DetailPageShell";
import { AppointmentDetailPanel } from "../../_components/AppointmentDetailPanel";

interface AppointmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  const { id } = await params;
  const [result, patientsRes, doctorsRes] = await Promise.all([
    getAppointmentDetail(id),
    getActivePatients(),
    getActiveDoctors(),
  ]);
  const { patientOptions, doctorOptions } = mapAppointmentPickerResults(patientsRes, doctorsRes);

  if (!result.success) notFound();

  const appointment = buildAppointmentDetail(result.data);

  return (
    <DetailPageShell breadcrumb={`Appointments › ${appointment.title}`}>
      <AppointmentDetailPanel
        mode="edit"
        appointment={appointment}
        patientOptions={patientOptions}
        doctorOptions={doctorOptions}
      />
    </DetailPageShell>
  );
}
