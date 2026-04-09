/**
 * app/(app)/appointments/new/page.tsx
 *
 * Full-page fallback for creating a new appointment.
 * Shown on direct URL access / hard refresh of /appointments/new.
 * During normal in-app navigation the intercepting modal takes over.
 */

import { loadAppointmentDoctorOptions } from "../_lib/appointment-picker-options";
import { parseNewAppointmentSearchParams } from "../_lib/parse-new-appointment-search-params";
import { DetailPageShell } from "@/components/layout/DetailPageShell";
import { AppointmentDetailPanel } from "../_components/AppointmentDetailPanel";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewAppointmentPage({ searchParams }: PageProps) {
  const { doctorOptions } = await loadAppointmentDoctorOptions();
  const sp = await searchParams;
  const initialValues = parseNewAppointmentSearchParams(sp);

  return (
    <DetailPageShell breadcrumb="Appointments › New Appointment">
      <AppointmentDetailPanel
        mode="create"
        doctorOptions={doctorOptions}
        initialValues={initialValues}
      />
    </DetailPageShell>
  );
}
