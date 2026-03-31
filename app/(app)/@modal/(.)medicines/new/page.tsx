/**
 * app/(app)/@modal/(.)medicines/new/page.tsx
 *
 * Server entry: `ModalShell` mounts immediately (no colocated loading.tsx).
 */

import { requirePermission } from "@/lib/auth/require-permission";
import { ModalShell } from "@/components/common/ModalShell";
import { NewMedicineModalClient } from "./NewMedicineModalClient";

export default async function NewMedicineModalPage() {
  await requirePermission("viewMedicines");

  return (
    <ModalShell size="lg" label="Add New Medicine">
      <NewMedicineModalClient />
    </ModalShell>
  );
}
