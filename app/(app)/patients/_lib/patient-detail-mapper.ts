/**
 * app/(app)/patients/_lib/patient-detail-mapper.ts
 *
 * Maps the `getPatientDetail` / `getPatientDetailCore` server action results to the UI
 * `PatientDetail` / `PatientDetailCore` types consumed by `PatientDetailPanel`.
 *
 * Used by both the full-page route (`patients/view/[id]/page.tsx`) and the
 * intercepting modal (`@modal/(.)patients/view/[id]/PatientViewModalContent.tsx`).
 */

import { format, parseISO, differenceInYears } from "date-fns";
import {
  mapAppointmentSummaryRowsToPatientAppointments,
  mapDocumentSummariesToPatientDocuments,
  mapServerPrescriptionSummariesToPatientUi,
} from "@/lib/detail-tab-ui-mappers";
import { formatPatientChartId } from "@/lib/utils/chart-id";
import { mapDbGenderToDisplay } from "@/lib/utils/map-patient-gender";
import type { getPatientDetail, getPatientDetailCore } from "@/lib/actions/patients";
import type { PatientDetail, PatientDetailCore } from "@/types/patient";

type PatientDetailData = Extract<
  Awaited<ReturnType<typeof getPatientDetail>>,
  { success: true }
>["data"];

type PatientDetailCoreData = Extract<
  Awaited<ReturnType<typeof getPatientDetailCore>>,
  { success: true }
>["data"];

function formatDob(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    const d = parseISO(raw);
    const age = differenceInYears(new Date(), d);
    return `${format(d, "MMM d, yyyy")} (${age} yrs)`;
  } catch {
    return raw;
  }
}

/** Maps core patient detail (no tab lists) for the Details column + activity. */
export function buildPatientDetailCore(r: PatientDetailCoreData): PatientDetailCore {
  return {
    id:                    r.id,
    chartId:               formatPatientChartId(r.chartId),
    firstName:             r.firstName,
    lastName:              r.lastName,
    email:                 r.email ?? "",
    phone:                 r.phone ?? "",
    dateOfBirth:           formatDob(r.dateOfBirth),
    dateOfBirthIso:        r.dateOfBirth
      ? typeof r.dateOfBirth === "string"
        ? r.dateOfBirth.slice(0, 10)
        : ""
      : "",
    gender:                mapDbGenderToDisplay(r.gender) ?? "Other",
    address:               r.address ?? "",
    bloodGroup:            r.bloodGroup ?? "",
    allergies:             r.allergies ?? null,
    emergencyContactName:  r.emergencyContactName ?? "",
    emergencyContactPhone: r.emergencyContactPhone ?? "",
    pastHistoryNotes:      r.pastHistoryNotes ?? "",
    assignedDoctor:        "",
    isActive:              r.isActive,
    status:                r.isActive ? "active" : "inactive",
    activityLog:           r.activityLog,
    activityLogHasMore:    r.activityLogHasMore,
  };
}

function mapPatientTabFields(r: PatientDetailData): Pick<
  PatientDetail,
  "appointments" | "prescriptions" | "documents"
> {
  return {
    appointments: mapAppointmentSummaryRowsToPatientAppointments(r.appointments ?? []),
    prescriptions: mapServerPrescriptionSummariesToPatientUi(r.prescriptions ?? []),
    documents: mapDocumentSummariesToPatientDocuments(r.documents),
  };
}

export function buildPatientDetail(r: PatientDetailData): PatientDetail {
  const { appointments, prescriptions, documents, ...corePayload } = r;
  void appointments;
  void prescriptions;
  void documents;
  return {
    ...buildPatientDetailCore(corePayload as PatientDetailCoreData),
    ...mapPatientTabFields(r),
  };
}
