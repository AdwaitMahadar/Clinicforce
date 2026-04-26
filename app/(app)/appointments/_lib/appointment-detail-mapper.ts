/**
 * app/(app)/appointments/_lib/appointment-detail-mapper.ts
 *
 * Maps the `getAppointmentDetail` server action result (DB shape) to the UI
 * `AppointmentDetail` type consumed by `AppointmentDetailPanel`.
 *
 * Used by both the full-page route (`appointments/view/[id]/page.tsx`) and the
 * intercepting modal (`@modal/(.)appointments/view/[id]/AppointmentViewModalContent.tsx`).
 */

import { differenceInYears, format, isValid, parseISO } from "date-fns";
import type { getAppointmentDetail } from "@/lib/actions/appointments";
import type { AppointmentDetail } from "@/types/appointment";
import type { PatientGender } from "@/types/patient";
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

function trimToNull(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t === "" ? null : t;
}

/** Maps DB enum string to display label; returns `null` when missing or unknown (no default). */
function mapDbGenderToDisplay(g: string | null | undefined): PatientGender | null {
  const t = trimToNull(g);
  if (t === null) return null;
  const lower = t.toLowerCase();
  if (lower === "male") return "Male";
  if (lower === "female") return "Female";
  if (lower === "other") return "Other";
  return null;
}

function ageFromPatientDob(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  try {
    const iso =
      typeof raw === "string"
        ? raw.slice(0, 10)
        : format(raw as Date, "yyyy-MM-dd");
    const d = parseISO(iso);
    if (!isValid(d)) return null;
    return differenceInYears(new Date(), d);
  } catch {
    return null;
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
    patientSummary: {
      fullName: trimToNull(r.patientName) ?? "—",
      ageYears: ageFromPatientDob(r.patientDateOfBirth),
      gender: mapDbGenderToDisplay(r.patientGender),
      bloodGroup: trimToNull(
        r.patientBloodGroup != null ? String(r.patientBloodGroup) : null
      ),
      allergies: trimToNull(r.patientAllergies),
      pastHistoryNotes: trimToNull(r.patientPastHistoryNotes),
    },
    prescription: r.prescription ?? null,
    prescriptionHistory: (r.prescriptionHistory ?? []).map((p) => ({
      id: p.id,
      chartId: p.chartId,
      appointmentId: p.appointmentId,
      scheduledAt:
        p.scheduledAt instanceof Date
          ? p.scheduledAt.toISOString()
          : String(p.scheduledAt),
      doctorName: p.doctorName,
      activeItemCount: p.activeItemCount,
      publishedAt:
        p.publishedAt == null
          ? ""
          : p.publishedAt instanceof Date
            ? p.publishedAt.toISOString()
            : String(p.publishedAt),
      items: p.items ?? [],
    })),
  };
}
