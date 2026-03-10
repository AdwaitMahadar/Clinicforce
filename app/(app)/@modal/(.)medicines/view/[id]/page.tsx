"use client";

/**
 * app/(app)/@modal/(.)medicines/view/[id]/page.tsx
 *
 * Intercepting modal for viewing/editing an existing medicine.
 * Triggered by clicking a medicine row in the dashboard table,
 * which pushes to /medicines/view/[id].
 *
 * ROUTING NOTE:
 * The /view/ sub-segment ensures this interceptor only matches
 * /medicines/view/[id] — never /medicines/dashboard, /medicines/new,
 * or /medicines/reports. This prevents the "frozen background" bug.
 *
 * Lifecycle:
 *   - Soft nav (Link/router.push) → this modal renders, dashboard stays mounted behind it
 *   - Hard refresh at /medicines/view/[id] → falls through to the full-page route
 *   - Back button / Escape → router.back() → modal closes, dashboard visible again
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getMockMedicineDetail } from "@/mock/medicines/detail";
import { MedicineDetailPanel } from "@/app/(app)/medicines/_components/MedicineDetailPanel";
import { ModalShell } from "@/components/common/ModalShell";

interface Props {
  params: Promise<{ id: string }>;
}

export default function InterceptedMedicineModal({ params }: Props) {
  const router = useRouter();
  const [medicine, setMedicine] = useState<ReturnType<typeof getMockMedicineDetail>>(null);

  useEffect(() => {
    params.then(({ id }) => setMedicine(getMockMedicineDetail(id)));
  }, [params]);

  const handleClose = useCallback(() => router.back(), [router]);

  if (!medicine) return null;

  return (
    <ModalShell size="xl" label={`Edit: ${medicine.name}`}>
      <MedicineDetailPanel
        mode="edit"
        medicine={medicine}
        onClose={handleClose}
      />
    </ModalShell>
  );
}
