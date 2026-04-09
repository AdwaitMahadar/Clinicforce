/**
 * app/(app)/@modal/(.)appointments/new/page.tsx
 *
 * Server entry: `ModalShell` mounts immediately (no colocated loading.tsx).
 */

import { ModalShell } from "@/components/common/ModalShell";
import { loadAppointmentDoctorOptions } from "@/app/(app)/appointments/_lib/appointment-picker-options";
import { parseNewAppointmentSearchParams } from "@/app/(app)/appointments/_lib/parse-new-appointment-search-params";
import { NewAppointmentModalClient } from "./NewAppointmentModalClient";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewAppointmentModalPage({
  searchParams,
}: PageProps) {
  const { doctorOptions } = await loadAppointmentDoctorOptions();
  const sp = await searchParams;
  const initialValues = parseNewAppointmentSearchParams(sp);

  return (
    <ModalShell size="lg" label="New Appointment">
      <NewAppointmentModalClient
        doctorOptions={doctorOptions}
        initialValues={initialValues}
      />
    </ModalShell>
  );
}
