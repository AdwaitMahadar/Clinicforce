/**
 * app/(app)/@modal/(.)appointments/view/[id]/page.tsx
 *
 * Intercepting modal: `ModalShell` mounts immediately; data loads inside `<Suspense>`.
 */

import { Suspense } from "react";
import { ModalShell } from "@/components/common/ModalShell";
import { ModalDetailPanelBodySkeleton } from "@/components/common/skeletons";
import { AppointmentViewModalContent } from "./AppointmentViewModalContent";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InterceptedAppointmentModal({ params }: Props) {
  const { id } = await params;

  return (
    <ModalShell size="xl" label="Appointment">
      <Suspense fallback={<ModalDetailPanelBodySkeleton variant="detail" />}>
        <AppointmentViewModalContent id={id} />
      </Suspense>
    </ModalShell>
  );
}
