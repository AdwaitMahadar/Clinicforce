/**
 * app/(app)/@modal/(.)appointments/new/page.tsx
 *
 * Server entry: `ModalShell` mounts immediately (no colocated loading.tsx).
 */

import { ModalShell } from "@/components/common/ModalShell";
import { loadAppointmentDoctorOptions } from "@/app/(app)/appointments/_lib/appointment-picker-options";
import { NewAppointmentModalClient } from "./NewAppointmentModalClient";

export default async function NewAppointmentModalPage() {
  const { doctorOptions } = await loadAppointmentDoctorOptions();

  return (
    <ModalShell size="lg" label="New Appointment">
      <NewAppointmentModalClient doctorOptions={doctorOptions} />
    </ModalShell>
  );
}
