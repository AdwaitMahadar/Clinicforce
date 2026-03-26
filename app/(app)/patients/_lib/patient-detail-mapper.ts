/**
 * app/(app)/patients/_lib/patient-detail-mapper.ts
 *
 * Maps the `getPatientDetail` server action result (DB shape) to the UI
 * `PatientDetail` type consumed by `PatientDetailPanel`.
 *
 * Used by both the full-page route (`patients/view/[id]/page.tsx`) and the
 * intercepting modal (`@modal/(.)patients/view/[id]/PatientViewModalContent.tsx`).
 */

import { format, parseISO, differenceInYears } from "date-fns";
import { formatPatientChartId } from "@/lib/utils/chart-id";
import type { getPatientDetail } from "@/lib/actions/patients";
import type { PatientDetail } from "@/types/patient";

type PatientDetailData = Extract<
  Awaited<ReturnType<typeof getPatientDetail>>,
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

export function buildPatientDetail(r: PatientDetailData): PatientDetail {
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
    gender:                (r.gender as PatientDetail["gender"]) ?? "Other",
    address:               r.address ?? "",
    bloodGroup:            r.bloodGroup ?? "",
    allergies:             r.allergies ?? null,
    emergencyContactName:  r.emergencyContactName ?? "",
    emergencyContactPhone: r.emergencyContactPhone ?? "",
    notes:                 r.notes ?? "",
    assignedDoctor:        "",
    status:                r.isActive ? "active" : "inactive",
    appointments: (r.appointments ?? []).map((a) => ({
      id:     a.id,
      title:  a.title,
      doctor: a.doctor ?? "",
      date:   a.scheduledAt ? format(new Date(a.scheduledAt), "MMM d, yyyy") : "",
      time:   a.scheduledAt ? format(new Date(a.scheduledAt), "hh:mm a") : "",
      status: a.status as PatientDetail["appointments"][number]["status"],
    })),
    documents: r.documents.map((d) => ({
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
    activityLog: [],
  };
}
