/**
 * app/(app)/appointments/new/page.tsx
 *
 * Full-page fallback for creating a new appointment.
 * Shown on direct URL access / hard refresh of /appointments/new.
 * During normal in-app navigation the intercepting modal takes over.
 */

import { loadAppointmentDoctorOptions } from "../_lib/appointment-picker-options";
import { DetailPageShell } from "@/components/layout/DetailPageShell";
import { AppointmentDetailPanel } from "../_components/AppointmentDetailPanel";

export default async function NewAppointmentPage() {
  const { doctorOptions } = await loadAppointmentDoctorOptions();

  return (
    <DetailPageShell breadcrumb="Appointments › New Appointment">
      <AppointmentDetailPanel
        mode="create"
        doctorOptions={doctorOptions}
      />
    </DetailPageShell>
  );
}
