"use client";

/**
 * Client body for the intercepting medicine-detail modal: wires `onClose` so
 * Save / deactivate dismiss the modal (same pattern as `PatientViewModalClient`).
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { MedicineDetail } from "@/types/medicine";
import { MedicineDetailPanel } from "@/app/(app)/medicines/_components/MedicineDetailPanel";

export function MedicineViewModalClient({ medicine }: { medicine: MedicineDetail }) {
  const router = useRouter();
  const handleClose = useCallback(() => router.back(), [router]);

  return <MedicineDetailPanel mode="edit" medicine={medicine} onClose={handleClose} />;
}
