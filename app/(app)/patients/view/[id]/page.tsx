/**
 * app/(app)/patients/view/[id]/page.tsx
 *
 * Full-page fallback for patient detail.
 * Shown on direct URL access / hard refresh of /patients/view/[id].
 * During normal in-app row-click navigation, the intercepting modal takes over.
 */

import { notFound } from "next/navigation";
import { getPatientDetail } from "@/lib/actions/patients";
import { PatientDetailPanel } from "../../_components/PatientDetailPanel";
import type { PatientDetail } from "@/types/patient";
import { format, parseISO, differenceInYears } from "date-fns";

interface PatientDetailPageProps {
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

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params;
  const result = await getPatientDetail(id);

  if (!result.success) notFound();

  const r = result.data;
  const patient: PatientDetail = {
    id:                   r.id,
    chartId:              `#PT-${r.chartId}`,
    firstName:            r.firstName,
    lastName:             r.lastName,
    email:                r.email ?? "",
    phone:                r.phone ?? "",
    dateOfBirth:          formatDob(r.dateOfBirth),
    dateOfBirthIso:       r.dateOfBirth
      ? typeof r.dateOfBirth === "string"
        ? r.dateOfBirth.slice(0, 10)
        : ""
      : "",
    gender:               (r.gender as PatientDetail["gender"]) ?? "Other",
    address:              r.address ?? "",
    bloodGroup:           r.bloodGroup ?? "",
    allergies:            r.allergies ?? null,
    emergencyContactName: r.emergencyContactName ?? "",
    emergencyContactPhone:r.emergencyContactPhone ?? "",
    notes:                r.notes ?? "",
    assignedDoctor:       "",
    status:               r.isActive ? "active" : "inactive",
    // Joined arrays from getPatientById — map to display shape
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
    // TODO: Implement when audit_log table is built.
    activityLog: [],
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="max-w-[1700px] mx-auto w-full flex-1 min-h-0 flex flex-col">
        <p
          className="text-xs font-medium mb-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          Patients › {patient.firstName} {patient.lastName}
        </p>

        <div
          className="flex-1 rounded-2xl overflow-hidden min-h-0"
          style={{
            background: "var(--color-glass-fill-data)",
            border:     "1px solid var(--color-border)",
            boxShadow:  "var(--shadow-card)",
          }}
        >
          <PatientDetailPanel mode="view" patient={patient} />
        </div>
      </div>
    </div>
  );
}
