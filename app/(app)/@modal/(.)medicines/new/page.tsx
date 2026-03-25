"use client";

/**
 * app/(app)/@modal/(.)medicines/new/page.tsx
 *
 * Intercepting modal for creating a new medicine.
 * Triggered when the "Add Medicine" button does a client-side
 * router.push('/medicines/new') from within the app layout.
 *
 * Interaction model (all handled by ModalShell):
 *   - Backdrop click → router.back()
 *   - Escape key     → router.back()
 *   - Close button   → router.back() (panel calls onClose on success)
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { MedicineDetailPanel } from "@/app/(app)/medicines/_components/MedicineDetailPanel";
import { ModalShell } from "@/components/common/ModalShell";

export default function NewMedicineModal() {
  const router = useRouter();

  // Still needed here so MedicineDetailPanel.onClose can call it after submit
  const handleClose = useCallback(() => router.back(), [router]);

  return (
    <ModalShell size="lg" label="Add New Medicine">
      <MedicineDetailPanel mode="create" onClose={handleClose} />
    </ModalShell>
  );
}
