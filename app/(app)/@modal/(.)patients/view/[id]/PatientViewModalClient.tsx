"use client";

/**
 * Client body for the intercepting patient-detail modal: wires `onClose` so Save
 * can dismiss the modal (same pattern as `NewPatientModalClient`).
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PatientDetail } from "@/types/patient";
import { PatientDetailPanel } from "@/app/(app)/patients/_components/PatientDetailPanel";

export function PatientViewModalClient({ patient }: { patient: PatientDetail }) {
  const router = useRouter();
  const handleClose = useCallback(() => router.back(), [router]);

  return (
    <PatientDetailPanel mode="view" patient={patient} onClose={handleClose} />
  );
}
