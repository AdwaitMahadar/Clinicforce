"use client";

/**
 * Client body for the intercepting new-patient modal (wrapped by server `page.tsx` + ModalShell).
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { PatientDetailPanel } from "@/app/(app)/patients/_components/PatientDetailPanel";

export function NewPatientModalClient() {
  const router = useRouter();
  const handleClose = useCallback(() => router.back(), [router]);

  return <PatientDetailPanel mode="create" onClose={handleClose} />;
}
