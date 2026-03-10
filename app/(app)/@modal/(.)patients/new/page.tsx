"use client";

/**
 * app/(app)/@modal/(.)patients/new/page.tsx
 *
 * Intercepting modal for creating a new patient.
 * Triggered when the "New Patient" button does a client-side
 * router.push('/patients/new') from the patients dashboard.
 *
 * Lifecycle:
 *   - Soft nav → this modal renders, dashboard stays mounted behind it
 *   - Hard refresh at /patients/new → falls through to the full-page route
 *   - Cancel button / Escape → router.back() → modal closes, dashboard visible again
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { PatientDetailPanel } from "@/app/(app)/patients/_components/PatientDetailPanel";
import { ModalShell } from "@/components/common/ModalShell";

export default function NewPatientModal() {
  const router = useRouter();
  const handleClose = useCallback(() => router.back(), [router]);

  return (
    <ModalShell size="lg" label="New Patient">
      <PatientDetailPanel mode="create" onClose={handleClose} />
    </ModalShell>
  );
}
