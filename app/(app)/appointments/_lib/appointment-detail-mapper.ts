/**
 * app/(app)/appointments/_lib/appointment-detail-mapper.ts
 *
 * Maps the `getAppointmentDetail` / `getAppointmentDetailCore` server action results
 * to the UI `AppointmentDetail` / `AppointmentDetailCore` types consumed by
 * `AppointmentDetailPanel`.
 *
 * Used by both the full-page route (`appointments/view/[id]/page.tsx`) and the
 * intercepting modal (`@modal/(.)appointments/view/[id]/AppointmentViewModalContent.tsx`).
 */

import { differenceInYears, format, isValid, parseISO } from "date-fns";
import type { getAppointmentDetail, getAppointmentDetailCore } from "@/lib/actions/appointments";
import {
  mapAppointmentSummaryRowsToPatientAppointments,
  mapDocumentSummariesToPatientDocuments,
  mapServerPrescriptionSummariesToPatientUi,
} from "@/lib/detail-tab-ui-mappers";
import type { AppointmentDetail, AppointmentDetailCore } from "@/types/appointment";
import { DEFAULT_APPOINTMENT_DURATION_MINUTES } from "@/lib/constants/appointment";
import { mapDbGenderToDisplay } from "@/lib/utils/map-patient-gender";

type AppointmentDetailData = Extract<
  Awaited<ReturnType<typeof getAppointmentDetail>>,
  { success: true }
>["data"];

type AppointmentDetailCoreData = Extract<
  Awaited<ReturnType<typeof getAppointmentDetailCore>>,
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

/** Maps core detail action payload (no tab aggregates) to the Details column + sidebar card + activity. */
export function buildAppointmentDetailCore(r: AppointmentDetailCoreData): AppointmentDetailCore {
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
    category:        r.category as AppointmentDetailCore["category"],
    visitType:       r.visitType as AppointmentDetailCore["visitType"],
    status:          r.status as AppointmentDetailCore["status"],
    scheduledDate:   sa ? format(sa, "yyyy-MM-dd") : "",
    scheduledTime:   sa ? format(sa, "HH:mm") : "",
    duration:        Number(r.duration ?? DEFAULT_APPOINTMENT_DURATION_MINUTES),
    fee:             r.fee != null && Number.isFinite(Number(r.fee)) ? Number(r.fee) : null,
    actualCheckIn:   fmtHm(r.actualCheckIn),
    description:     r.description ?? "",
    notes:           r.notes ?? "",
    activityLog:     r.activityLog,
    activityLogHasMore: r.activityLogHasMore,
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
  };
}

function mapAppointmentTabFields(r: AppointmentDetailData): Pick<
  AppointmentDetail,
  "patientDocuments" | "patientAppointments" | "prescription" | "prescriptionHistory"
> {
  return {
    patientDocuments: mapDocumentSummariesToPatientDocuments(r.patientDocuments ?? []),
    patientAppointments: mapAppointmentSummaryRowsToPatientAppointments(
      r.patientAppointments ?? []
    ),
    prescription: r.prescription ?? null,
    prescriptionHistory: mapServerPrescriptionSummariesToPatientUi(
      r.prescriptionHistory ?? []
    ),
  };
}

export function buildAppointmentDetail(r: AppointmentDetailData): AppointmentDetail {
  const {
    patientDocuments,
    patientAppointments,
    prescription,
    prescriptionHistory,
    ...corePayload
  } = r;
  void patientDocuments;
  void patientAppointments;
  void prescription;
  void prescriptionHistory;
  return {
    ...buildAppointmentDetailCore(corePayload as AppointmentDetailCoreData),
    ...mapAppointmentTabFields(r),
  };
}
