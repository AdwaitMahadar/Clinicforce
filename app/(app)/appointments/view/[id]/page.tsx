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
    <div className="p-8 h-full flex flex-col">
      <div className="max-w-[1700px] mx-auto w-full flex-1 min-h-0 flex flex-col">
        <p
          className="text-xs font-medium mb-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          Appointments › {appointment.title}
        </p>

        <div
          className="flex-1 rounded-2xl overflow-hidden min-h-0"
          style={{
            background: "var(--color-glass-fill-data)",
            border:     "1px solid var(--color-border)",
            boxShadow:  "var(--shadow-card)",
          }}
        >
          <AppointmentDetailPanel
            mode="edit"
            appointment={appointment}
            patientOptions={patientOptions}
            doctorOptions={doctorOptions}
          />
        </div>
      </div>
    </div>
  );
}
