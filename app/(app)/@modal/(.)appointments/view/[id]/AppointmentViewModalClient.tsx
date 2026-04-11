"use client";

/**
 * Client body for the intercepting appointment-detail modal: wires `onClose` so
 * Save / cancel appointment dismiss the modal (same pattern as `PatientViewModalClient`).
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppointmentDetailPanel } from "@/app/(app)/appointments/_components/AppointmentDetailPanel";
import type {
  AppointmentDetail,
  AppointmentSelectOption,
} from "@/types/appointment";

type Props = {
  appointment: AppointmentDetail;
  doctorOptions: AppointmentSelectOption[];
};

export function AppointmentViewModalClient({ appointment, doctorOptions }: Props) {
  const router = useRouter();
  const handleClose = useCallback(() => router.back(), [router]);

  return (
    <AppointmentDetailPanel
      mode="edit"
      appointment={appointment}
      doctorOptions={doctorOptions}
      onClose={handleClose}
    />
  );
}
