/**
 * app/(app)/@modal/(.)appointments/view/[id]/page.tsx
 *
 * Intercepting modal — async Server Component.
 * Fetches appointment detail directly. No useEffect, no useState.
 */

import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getAppointmentDetail } from "@/lib/actions/appointments";
import { AppointmentDetailPanel } from "@/app/(app)/appointments/_components/AppointmentDetailPanel";
import { ModalShell } from "@/components/common/ModalShell";
import type { AppointmentDetail } from "@/types/appointment";

interface Props {
  params: Promise<{ id: string }>;
}

function fmtTime(v: Date | string | null | undefined): string {
  if (!v) return "";
  try { return format(new Date(v as string), "HH:mm"); } catch { return ""; }
}

export default async function InterceptedAppointmentModal({ params }: Props) {
  const { id } = await params;
  const result = await getAppointmentDetail(id);

  if (!result.success) notFound();

  const r = result.data;
  const appointment: AppointmentDetail = {
    id:                 r.id,
    patientId:          r.patientId,
    patientName:        r.patientName,
    patientInitials:    r.patientName.slice(0, 2).toUpperCase(),
    doctorId:           r.doctorId,
    doctorName:         r.doctorName,
    title:              r.title,
    type:               r.type    as AppointmentDetail["type"],
    status:             r.status  as AppointmentDetail["status"],
    date:               r.date ? new Date(r.date).toISOString().slice(0, 10) : "",
    duration:           Number(r.duration ?? 30),
    scheduledStartTime: fmtTime(r.scheduledStartTime),
    actualCheckIn:      fmtTime(r.actualCheckIn),
    description:        r.description    ?? "",
    notes:              r.notes          ?? "",
    activityLog:        [],
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
    <ModalShell size="xl" label={`Edit: ${appointment.title}`}>
      <AppointmentDetailPanel mode="edit" appointment={appointment} />
    </ModalShell>
  );
}
