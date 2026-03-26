/**
 * app/(app)/@modal/(.)medicines/new/page.tsx
 *
 * Server entry: `ModalShell` mounts immediately (no colocated loading.tsx).
 */

import { ModalShell } from "@/components/common/ModalShell";
import { NewMedicineModalClient } from "./NewMedicineModalClient";

export default function NewMedicineModalPage() {
  return (
    <ModalShell size="lg" label="Add New Medicine">
      <NewMedicineModalClient />
    </ModalShell>
  );
}
