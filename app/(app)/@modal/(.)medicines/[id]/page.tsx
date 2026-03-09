"use client";

/**
 * app/(app)/@modal/(.)medicines/[id]/page.tsx
 *
 * Intercepting modal route for medicine detail (edit).
 *
 * Renders when the user clicks a medicine row during client-side navigation.
 * Next.js intercepts the /medicines/[id] URL and renders this overlay while
 * keeping the underlying dashboard mounted.
 *
 * On direct URL access / hard refresh, this route is bypassed in favour of
 * app/(app)/medicines/[id]/page.tsx.
 */

import { useState, useEffect } from "react";
import { getMockMedicineDetail } from "@/mock/medicines/detail";
import { MedicineDetailPanel } from "@/app/(app)/medicines/_components/MedicineDetailPanel";
import { ModalShell } from "@/components/common/ModalShell";

interface Props {
  params: Promise<{ id: string }>;
}

export default function InterceptedMedicineModal({ params }: Props) {
  const [medicine, setMedicine] = useState<ReturnType<typeof getMockMedicineDetail>>(null);

  // Unwrap Next.js 15 async params
  useEffect(() => {
    params.then(({ id }) => setMedicine(getMockMedicineDetail(id)));
  }, [params]);

  if (!medicine) return null;

  return (
    <ModalShell size="xl" label={`Edit ${medicine.name}`}>
      <MedicineDetailPanel mode="edit" medicine={medicine} />
    </ModalShell>
  );
}
