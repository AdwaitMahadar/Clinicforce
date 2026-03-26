/**
 * app/(app)/appointments/view/[id]/page.tsx
 *
 * Full-page fallback for appointment detail.
 * Shown on direct URL access / hard refresh of /appointments/view/[id].
 * During normal in-app navigation the intercepting modal takes over.
 */

import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  getAppointmentDetail,
  getActivePatients,
  getActiveDoctors,
} from "@/lib/actions/appointments";
import { mapAppointmentPickerResults } from "../../_lib/appointment-picker-options";
import { AppointmentDetailPanel } from "../../_components/AppointmentDetailPanel";
import type { AppointmentDetail } from "@/types/appointment";

interface AppointmentDetailPageProps {
  params: Promise<{ id: string }>;
}

function fmtHm(v: Date | string | null | undefined): string {
  if (!v) return "";
  try {
    return format(new Date(v as string), "HH:mm");
  } catch {
    return "";
  }
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

  const r = result.data;
  const sa = r.scheduledAt ? new Date(r.scheduledAt) : null;
  const appointment: AppointmentDetail = {
    id:                 r.id,
    patientId:          r.patientId,
    patientName:        r.patientName,
    patientInitials:    r.patientName.slice(0, 2).toUpperCase(),
    doctorId:           r.doctorId,
    doctorName:         r.doctorName,
    title:              r.title,
    // Cast from DB enum subset → UI display type union
    type:            r.type as AppointmentDetail["type"],
    status:          r.status as AppointmentDetail["status"],
    scheduledDate:   sa ? format(sa, "yyyy-MM-dd") : "",
    scheduledTime:   sa ? format(sa, "HH:mm") : "",
    duration:        Number(r.duration ?? 30),
    actualCheckIn:   fmtHm(r.actualCheckIn),
    description:       r.description ?? "",
    notes:             r.notes ?? "",
    // TODO: Implement when audit_log table is built.
    activityLog:       [],
    documents:          (r.documents ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      fileName: d.fileName,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      type: d.type,
      uploadedAt:
        d.uploadedAt instanceof Date
          ? d.uploadedAt.toISOString()
          : String(d.uploadedAt),
    })),
  };

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
