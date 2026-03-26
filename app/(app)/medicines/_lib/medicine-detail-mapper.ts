/**
 * app/(app)/medicines/_lib/medicine-detail-mapper.ts
 *
 * Maps the `getMedicineDetail` server action result (DB shape) to the UI
 * `MedicineDetail` type consumed by `MedicineDetailPanel`.
 *
 * Used by both the full-page route (`medicines/view/[id]/page.tsx`) and the
 * intercepting modal (`@modal/(.)medicines/view/[id]/MedicineViewModalContent.tsx`).
 */

import type { getMedicineDetail } from "@/lib/actions/medicines";
import type { MedicineDetail } from "@/types/medicine";

type MedicineDetailData = Extract<
  Awaited<ReturnType<typeof getMedicineDetail>>,
  { success: true }
>["data"];

export function buildMedicineDetail(r: MedicineDetailData): MedicineDetail {
  return {
    id:                 r.id,
    name:               r.name,
    category:           r.category ?? "",
    brand:              r.brand ?? "",
    form:               r.form ?? "",
    description:        r.description ?? "",
    lastPrescribedDate: r.lastPrescribedDate
      ? new Date(r.lastPrescribedDate).toISOString().slice(0, 10)
      : "",
    isActive:  r.isActive ?? true,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
    createdBy: "",
    activityLog: [],
  };
}
