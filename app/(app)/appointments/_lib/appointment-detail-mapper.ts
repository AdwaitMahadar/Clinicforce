/**
 * app/(app)/appointments/_lib/appointment-detail-mapper.ts
 *
 * Maps the `getAppointmentDetail` server action result (DB shape) to the UI
 * `AppointmentDetail` type consumed by `AppointmentDetailPanel`.
 *
 * Used by both the full-page route (`appointments/view/[id]/page.tsx`) and the
 * intercepting modal (`@modal/(.)appointments/view/[id]/AppointmentViewModalContent.tsx`).
 */

import { format } from "date-fns";
import type { getAppointmentDetail } from "@/lib/actions/appointments";
import type { AppointmentDetail } from "@/types/appointment";
import { DEFAULT_APPOINTMENT_DURATION_MINUTES } from "@/lib/constants/appointment";

type AppointmentDetailData = Extract<
  Awaited<ReturnType<typeof getAppointmentDetail>>,
  { success: true }
>["data"];

function fmtHm(v: Date | string | null | undefined): string {
  if (!v) return "";
  try {
    return format(new Date(v as string), "HH:mm");
  } catch {
    return "";
  }
}

export function buildAppointmentDetail(r: AppointmentDetailData): AppointmentDetail {
  const sa = r.scheduledAt ? new Date(r.scheduledAt) : null;
  return {
    id:              r.id,
    patientId:       r.patientId,
    patientName:     r.patientName,
    patientChartId:  r.patientChartId,
    patientInitials: r.patientName.slice(0, 2).toUpperCase(),
    doctorId:        r.doctorId,
    doctorName:      r.doctorName,
    title:           r.title,
    category:        r.category as AppointmentDetail["category"],
    visitType:       r.visitType as AppointmentDetail["visitType"],
    status:          r.status as AppointmentDetail["status"],
    scheduledDate:   sa ? format(sa, "yyyy-MM-dd") : "",
    scheduledTime:   sa ? format(sa, "HH:mm") : "",
    duration:        Number(r.duration ?? DEFAULT_APPOINTMENT_DURATION_MINUTES),
    actualCheckIn:   fmtHm(r.actualCheckIn),
    description:     r.description ?? "",
    notes:           r.notes ?? "",
    activityLog:     [],
    documents: (r.documents ?? []).map((d) => ({
      id:         d.id,
      title:      d.title,
      fileName:   d.fileName,
      mimeType:   d.mimeType,
      fileSize:   d.fileSize,
      type:       d.type,
      uploadedAt:
        d.uploadedAt instanceof Date
          ? d.uploadedAt.toISOString()
          : String(d.uploadedAt),
    })),
  };
}
