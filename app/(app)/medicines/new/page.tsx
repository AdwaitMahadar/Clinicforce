/**
 * app/(app)/medicines/new/page.tsx
 *
 * Full-page fallback for adding a new medicine.
 * Shown on direct URL access / refresh of /medicines/new.
 * During normal in-app navigation the intercepting modal takes over.
 */

import { requirePermission } from "@/lib/auth/require-permission";
import { DetailPageShell } from "@/components/layout/DetailPageShell";
import { MedicineDetailPanel } from "../_components/MedicineDetailPanel";

export default async function NewMedicinePage() {
  await requirePermission("viewMedicines");

  return (
    <DetailPageShell breadcrumb="Medicines › New Medicine">
      <MedicineDetailPanel mode="create" />
    </DetailPageShell>
  );
}
