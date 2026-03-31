/**
 * app/(app)/@modal/(.)medicines/view/[id]/page.tsx
 *
 * Intercepting modal: `ModalShell` mounts immediately; data loads inside `<Suspense>`.
 */

import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/require-permission";
import { ModalShell } from "@/components/common/ModalShell";
import { ModalDetailPanelBodySkeleton } from "@/components/common/skeletons";
import { MedicineViewModalContent } from "./MedicineViewModalContent";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InterceptedMedicineModal({ params }: Props) {
  await requirePermission("viewMedicines");

  const { id } = await params;

  return (
    <ModalShell size="xl" label="Medicine">
      <Suspense fallback={<ModalDetailPanelBodySkeleton variant="detail" />}>
        <MedicineViewModalContent id={id} />
      </Suspense>
    </ModalShell>
  );
}
