/**
 * app/(app)/@modal/(.)appointments/new/page.tsx
 *
 * Server entry: `ModalShell` mounts immediately (no colocated loading.tsx).
 */

import { ModalShell } from "@/components/common/ModalShell";
import { NewAppointmentModalClient } from "./NewAppointmentModalClient";

export default function NewAppointmentModalPage() {
  return (
    <ModalShell size="lg" label="New Appointment">
      <NewAppointmentModalClient />
    </ModalShell>
  );
}
