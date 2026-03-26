/**
 * app/(app)/@modal/(.)patients/view/[id]/page.tsx
 *
 * Intercepting modal: `ModalShell` mounts immediately; data loads inside `<Suspense>`.
 */

import { Suspense } from "react";
import { ModalShell } from "@/components/common/ModalShell";
import { ModalDetailPanelBodySkeleton } from "@/components/common/skeletons";
import { PatientViewModalContent } from "./PatientViewModalContent";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InterceptedPatientModal({ params }: Props) {
  const { id } = await params;

  return (
    <ModalShell size="xl" label="Patient record">
      <Suspense fallback={<ModalDetailPanelBodySkeleton variant="detail" />}>
        <PatientViewModalContent id={id} />
      </Suspense>
    </ModalShell>
  );
}
