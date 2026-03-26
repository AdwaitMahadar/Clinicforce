"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppointmentDetailPanel } from "@/app/(app)/appointments/_components/AppointmentDetailPanel";
import type { AppointmentSelectOption } from "@/types/appointment";

type Props = {
  patientOptions: AppointmentSelectOption[];
  doctorOptions: AppointmentSelectOption[];
};

export function NewAppointmentModalClient({ patientOptions, doctorOptions }: Props) {
  const router = useRouter();
  const handleClose = useCallback(() => router.back(), [router]);

  return (
    <AppointmentDetailPanel
      mode="create"
      patientOptions={patientOptions}
      doctorOptions={doctorOptions}
      onClose={handleClose}
    />
  );
}
