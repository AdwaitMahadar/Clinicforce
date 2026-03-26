"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { MedicineDetailPanel } from "@/app/(app)/medicines/_components/MedicineDetailPanel";

export function NewMedicineModalClient() {
  const router = useRouter();
  const handleClose = useCallback(() => router.back(), [router]);

  return <MedicineDetailPanel mode="create" onClose={handleClose} />;
}
