/**
 * app/(app)/@modal/(.)patients/view/[id]/page.tsx
 *
 * Intercepting modal: `ModalShell` mounts immediately; data loads inside `<Suspense>`.
 */

import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { ModalShell } from "@/components/common/ModalShell";
import { ModalDetailPanelBodySkeleton } from "@/components/common/skeletons";
import { PatientViewModalContent } from "./PatientViewModalContent";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InterceptedPatientModal({ params }: Props) {
  const [session, { id }] = await Promise.all([getSession(), params]);
  // Staff sees no sidebar — use the narrower modal size (same as create mode).
  const size = session.user.type === "staff" ? "lg" : "xl";

  return (
    <ModalShell size={size} label="Patient record">
      <Suspense fallback={<ModalDetailPanelBodySkeleton variant="detail" />}>
        <PatientViewModalContent id={id} />
      </Suspense>
    </ModalShell>
  );
}
