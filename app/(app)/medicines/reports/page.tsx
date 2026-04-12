/**
 * app/(app)/medicines/reports/page.tsx
 *
 * Placeholder reports view — same permission guard as other medicines routes.
 */

import { requirePermission } from "@/lib/auth/require-permission";
import { ReportsComingSoon } from "@/components/common";

export default async function MedicinesReportsPage() {
  await requirePermission("viewMedicines");

  return (
    <ReportsComingSoon
      title="Medicines Reports"
      subtitle="Prescribing trends and medicine usage analytics."
    />
  );
}
