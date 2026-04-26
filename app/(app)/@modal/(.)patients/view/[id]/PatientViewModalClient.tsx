"use client";

/**
 * Client body for the intercepting patient-detail modal: wires `onClose` so Save
 * can dismiss the modal (same pattern as `NewPatientModalClient`).
 */

import { useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { PatientDetailCore } from "@/types/patient";
import { PatientDetailPanel } from "@/app/(app)/patients/_components/PatientDetailPanel";

type Props = {
  patient: PatientDetailCore;
  documentsTab: ReactNode;
  appointmentsTab: ReactNode;
  prescriptionsTab?: ReactNode;
};

export function PatientViewModalClient({
  patient,
  documentsTab,
  appointmentsTab,
  prescriptionsTab,
}: Props) {
  const router = useRouter();
  const handleClose = useCallback(() => router.back(), [router]);

  return (
    <PatientDetailPanel
      mode="view"
      patient={patient}
      documentsTab={documentsTab}
      appointmentsTab={appointmentsTab}
      prescriptionsTab={prescriptionsTab}
      onClose={handleClose}
    />
  );
}
