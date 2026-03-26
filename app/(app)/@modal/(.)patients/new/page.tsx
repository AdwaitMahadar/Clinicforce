/**
 * app/(app)/@modal/(.)patients/new/page.tsx
 *
 * Server entry: `ModalShell` mounts immediately (no colocated loading.tsx) so
 * soft navigation does not flash a duplicate skeleton modal before the client panel.
 */

import { ModalShell } from "@/components/common/ModalShell";
import { NewPatientModalClient } from "./NewPatientModalClient";

export default function NewPatientModalPage() {
  return (
    <ModalShell size="lg" label="New Patient">
      <NewPatientModalClient />
    </ModalShell>
  );
}
