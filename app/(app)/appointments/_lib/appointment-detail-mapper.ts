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
import { formatAppointmentHeading } from "@/lib/utils/format-appointment-heading";

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
    fee:             r.fee != null && Number.isFinite(Number(r.fee)) ? Number(r.fee) : null,
    actualCheckIn:   fmtHm(r.actualCheckIn),
    description:     r.description ?? "",
    notes:           r.notes ?? "",
    activityLog:     r.activityLog,
    activityLogHasMore: r.activityLogHasMore,
    patientDocuments: (r.patientDocuments ?? []).map((d) => ({
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
    patientAppointments: (r.patientAppointments ?? []).map((a) => ({
      id:        a.id,
      title:     a.title,
      category:  a.category,
      visitType: a.visitType,
      heading:   formatAppointmentHeading({
        category:  a.category,
        visitType: a.visitType,
        title:     a.title,
      }),
      doctor: a.doctor ?? "",
      date:   a.scheduledAt ? format(new Date(a.scheduledAt), "MMM d, yyyy") : "",
      time:   a.scheduledAt ? format(new Date(a.scheduledAt), "hh:mm a") : "",
      status: a.status as AppointmentDetail["patientAppointments"][number]["status"],
    })),
  };
}
