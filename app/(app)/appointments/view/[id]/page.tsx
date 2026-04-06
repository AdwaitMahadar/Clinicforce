/**
 * app/(app)/appointments/view/[id]/page.tsx
 *
 * Full-page fallback for appointment detail.
 * Shown on direct URL access / hard refresh of /appointments/view/[id].
 * During normal in-app navigation the intercepting modal takes over.
 */

import { notFound } from "next/navigation";
import { getAppointmentDetail, getActiveDoctors } from "@/lib/actions/appointments";
import { mapDoctorPickerResults } from "../../_lib/appointment-picker-options";
import { buildAppointmentDetail } from "../../_lib/appointment-detail-mapper";
import { DetailPageShell } from "@/components/layout/DetailPageShell";
import { AppointmentDetailPanel } from "../../_components/AppointmentDetailPanel";
import { formatAppointmentHeading } from "@/lib/utils/format-appointment-heading";

interface AppointmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  const { id } = await params;
  const [result, doctorsRes] = await Promise.all([
    getAppointmentDetail(id),
    getActiveDoctors(),
  ]);
  const { doctorOptions } = mapDoctorPickerResults(doctorsRes);

  if (!result.success) notFound();

  const appointment = buildAppointmentDetail(result.data);
  const t = appointment.title?.trim();
  const breadcrumbLabel = t
    ? t
    : formatAppointmentHeading({
        category:  appointment.category,
        visitType: appointment.visitType,
        title:     null,
      });

  return (
    <DetailPageShell breadcrumb={`Appointments › ${breadcrumbLabel}`}>
      <AppointmentDetailPanel
        mode="edit"
        appointment={appointment}
        doctorOptions={doctorOptions}
      />
    </DetailPageShell>
  );
}
