/**
 * app/(app)/@modal/(.)patients/view/[id]/page.tsx
 *
 * Intercepting modal — async Server Component.
 * Fetches patient detail directly. No useEffect, no useState.
 */

import { notFound } from "next/navigation";
import { format, parseISO, differenceInYears } from "date-fns";
import { getPatientDetail } from "@/lib/actions/patients";
import { PatientDetailPanel } from "@/app/(app)/patients/_components/PatientDetailPanel";
import { ModalShell } from "@/components/common/ModalShell";
import type { PatientDetail } from "@/types/patient";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDob(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    const d = parseISO(raw);
    const age = differenceInYears(new Date(), d);
    return `${format(d, "MMM d, yyyy")} (${age} yrs)`;
  } catch { return raw; }
}

export default async function InterceptedPatientModal({ params }: Props) {
  const { id } = await params;
  const result = await getPatientDetail(id);

  if (!result.success) notFound();

  const r = result.data;
  const patient: PatientDetail = {
    id:                    r.id,
    chartId:               `#PT-${r.chartId}`,
    firstName:             r.firstName,
    lastName:              r.lastName,
    email:                 r.email  ?? "",
    phone:                 r.phone  ?? "",
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
    emergencyContactName:  r.emergencyContactName  ?? "",
    emergencyContactPhone: r.emergencyContactPhone ?? "",
    notes:                 r.notes ?? "",
    assignedDoctor:        "",
    status:                r.isActive ? "active" : "inactive",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appointments: ((r as any).appointments ?? []).map((a: any) => ({
      id:     a.id,
      title:  a.title,
      doctor: "",
      date:   a.date ? format(new Date(a.date), "MMM d, yyyy") : "",
      time:   a.scheduledStartTime
        ? format(new Date(a.scheduledStartTime), "hh:mm a")
        : "",
      status: a.status,
    })),
    documents: r.documents.map((d) => ({
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
    activityLog: [],
  };

  return (
    <ModalShell size="xl" label={`${patient.firstName} ${patient.lastName} — Patient Record`}>
      <PatientDetailPanel mode="view" patient={patient} />
    </ModalShell>
  );
}
