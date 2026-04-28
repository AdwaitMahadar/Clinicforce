/**
 * Intercepting modal for `/settings`: `ModalShell` mounts immediately; data
 * loads inside `<Suspense>` (same pattern as `patients/view/[id]`).
 */

import { Suspense } from "react";
import { ModalShell } from "@/components/common/ModalShell";
import { ModalDetailPanelBodySkeleton } from "@/components/common/skeletons";
import { SettingsViewContent } from "@/app/(app)/settings/_components/SettingsViewContent";

export default function InterceptedSettingsModalPage() {
  return (
    <ModalShell size="xl" label="Settings">
      <Suspense fallback={<ModalDetailPanelBodySkeleton variant="detail" />}>
        <SettingsViewContent forModal />
      </Suspense>
    </ModalShell>
  );
}
