/**
 * app/(app)/@modal/(.)appointments/new/page.tsx
 *
 * Server entry: `ModalShell` mounts immediately (no colocated loading.tsx).
 */

import { ModalShell } from "@/components/common/ModalShell";
import { loadAppointmentFormSelectOptions } from "@/app/(app)/appointments/_lib/appointment-picker-options";
import { NewAppointmentModalClient } from "./NewAppointmentModalClient";

export default async function NewAppointmentModalPage() {
  const { patientOptions, doctorOptions } = await loadAppointmentFormSelectOptions();

  return (
    <ModalShell size="lg" label="New Appointment">
      <NewAppointmentModalClient
        patientOptions={patientOptions}
        doctorOptions={doctorOptions}
      />
    </ModalShell>
  );
}
