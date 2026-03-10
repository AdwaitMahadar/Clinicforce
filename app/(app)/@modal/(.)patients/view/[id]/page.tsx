"use client";

/**
 * app/(app)/@modal/(.)patients/view/[id]/page.tsx
 *
 * Intercepting modal for viewing a patient's detail record.
 * Triggered by clicking a row in the patients dashboard table,
 * which pushes to /patients/view/[id].
 *
 * ROUTING NOTE:
 * The /view/ sub-segment ensures this interceptor ONLY matches
 * /patients/view/[id] — never /patients/dashboard or /patients/reports.
 * This is the required pattern for all entity detail interceptors in this app.
 *
 * Lifecycle:
 *   - Soft nav (router.push) → this modal renders, dashboard stays mounted behind it
 *   - Hard refresh at /patients/view/[id] → falls through to the full-page route
 *   - Back button / Escape → router.back() → modal closes, dashboard is visible again
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getMockPatientDetail } from "@/mock/patients/detail";
import { PatientDetailPanel } from "@/app/(app)/patients/_components/PatientDetailPanel";
import { ModalShell } from "@/components/common/ModalShell";

interface Props {
  params: Promise<{ id: string }>;
}

export default function InterceptedPatientModal({ params }: Props) {
  const router = useRouter();
  const [patient, setPatient] = useState<ReturnType<typeof getMockPatientDetail>>(null);

  useEffect(() => {
    params.then(({ id }) => setPatient(getMockPatientDetail(id)));
  }, [params]);

  const handleClose = useCallback(() => router.back(), [router]);

  if (!patient) return null;

  return (
    <ModalShell size="xl" label={`${patient.firstName} ${patient.lastName} — Patient Record`}>
      <PatientDetailPanel mode="view" patient={patient} onClose={handleClose} />
    </ModalShell>
  );
}
