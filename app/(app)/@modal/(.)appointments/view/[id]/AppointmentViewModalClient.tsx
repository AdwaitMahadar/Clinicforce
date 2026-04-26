"use client";

/**
 * Client body for the intercepting appointment-detail modal: wires `onClose` so
 * Save / cancel appointment dismiss the modal (same pattern as `PatientViewModalClient`).
 */

import { useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppointmentDetailPanel } from "@/app/(app)/appointments/_components/AppointmentDetailPanel";
import type {
  AppointmentDetailCore,
  AppointmentSelectOption,
} from "@/types/appointment";

type Props = {
  appointment: AppointmentDetailCore;
  doctorOptions: AppointmentSelectOption[];
  documentsTab: ReactNode;
  appointmentsTab: ReactNode;
  prescriptionsTab?: ReactNode;
};

export function AppointmentViewModalClient({
  appointment,
  doctorOptions,
  documentsTab,
  appointmentsTab,
  prescriptionsTab,
}: Props) {
  const router = useRouter();
  const handleClose = useCallback(() => router.back(), [router]);

  return (
    <AppointmentDetailPanel
      mode="edit"
      appointment={appointment}
      doctorOptions={doctorOptions}
      documentsTab={documentsTab}
      appointmentsTab={appointmentsTab}
      prescriptionsTab={prescriptionsTab}
      onClose={handleClose}
    />
  );
}
