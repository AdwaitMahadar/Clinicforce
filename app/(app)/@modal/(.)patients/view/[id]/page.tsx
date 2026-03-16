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
    gender:                (r.gender as PatientDetail["gender"]) ?? "Other",
    address:               r.address ?? "",
    bloodGroup:            r.bloodGroup ?? "",
    allergies:             r.allergies ?? null,
    emergencyContactName:  r.emergencyContactName  ?? "",
    emergencyContactPhone: r.emergencyContactPhone ?? "",
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    documents: ((r as any).documents ?? []).map((d: any) => {
      const ext = (d.fileName ?? "").split(".").pop()?.toLowerCase() ?? "";
      const typeMap: Record<string, PatientDetail["documents"][0]["type"]> = {
        pdf: "pdf", doc: "doc", docx: "doc", xls: "xls", xlsx: "xls",
        jpg: "img", jpeg: "img", png: "img", webp: "img",
      };
      return {
        id:         d.id,
        name:       d.fileName ?? d.title,
        type:       typeMap[ext] ?? "other",
        size:       d.fileSize ? `${(d.fileSize / 1024 / 1024).toFixed(1)} MB` : "—",
        uploadedAt: d.createdAt ? format(new Date(d.createdAt), "MMM d") : "—",
      };
    }),
    activityLog: [],
  };

  return (
    <ModalShell size="xl" label={`${patient.firstName} ${patient.lastName} — Patient Record`}>
      <PatientDetailPanel mode="view" patient={patient} />
    </ModalShell>
  );
}
