import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  getAppointmentDetail,
  getActivePatients,
  getActiveDoctors,
} from "@/lib/actions/appointments";
import { mapAppointmentPickerResults } from "@/app/(app)/appointments/_lib/appointment-picker-options";
import { AppointmentDetailPanel } from "@/app/(app)/appointments/_components/AppointmentDetailPanel";
import type { AppointmentDetail } from "@/types/appointment";

function fmtHm(v: Date | string | null | undefined): string {
  if (!v) return "";
  try {
    return format(new Date(v as string), "HH:mm");
  } catch {
    return "";
  }
}

export async function AppointmentViewModalContent({ id }: { id: string }) {
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
    id: r.id,
    patientId: r.patientId,
    patientName: r.patientName,
    patientInitials: r.patientName.slice(0, 2).toUpperCase(),
    doctorId: r.doctorId,
    doctorName: r.doctorName,
    title: r.title,
    type: r.type as AppointmentDetail["type"],
    status: r.status as AppointmentDetail["status"],
    scheduledDate: sa ? format(sa, "yyyy-MM-dd") : "",
    scheduledTime: sa ? format(sa, "HH:mm") : "",
    duration: Number(r.duration ?? 30),
    actualCheckIn: fmtHm(r.actualCheckIn),
    description: r.description ?? "",
    notes: r.notes ?? "",
    activityLog: [],
    documents: (r.documents ?? []).map((d) => ({
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
    <AppointmentDetailPanel
      mode="edit"
      appointment={appointment}
      patientOptions={patientOptions}
      doctorOptions={doctorOptions}
    />
  );
}
