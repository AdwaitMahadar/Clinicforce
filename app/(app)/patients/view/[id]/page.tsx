/**
 * app/(app)/patients/view/[id]/page.tsx
 *
 * Full-page fallback for patient detail.
 * Shown on direct URL access / hard refresh of /patients/view/[id].
 * During normal in-app row-click navigation, the intercepting modal takes over.
 *
 * ROUTING NOTE:
 * Uses /view/[id] so the interceptor @modal/(.)patients/view/[id]
 * never conflicts with static nav segments like /patients/dashboard.
 */

import { notFound } from "next/navigation";
import { getMockPatientDetail } from "@/mock/patients/detail";
import { PatientDetailPanel } from "../../_components/PatientDetailPanel";

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params;
  const patient = getMockPatientDetail(id);

  if (!patient) notFound();

  return (
    <div className="p-8 h-full flex flex-col">
      <p
        className="text-xs font-medium mb-6"
        style={{ color: "var(--color-text-muted)" }}
      >
        Patients › {patient.firstName} {patient.lastName}
      </p>

      <div
        className="flex-1 rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-glass-fill-data)",
          border:     "1px solid var(--color-border)",
          boxShadow:  "var(--shadow-card)",
        }}
      >
        <PatientDetailPanel mode="view" patient={patient} />
      </div>
    </div>
  );
}
