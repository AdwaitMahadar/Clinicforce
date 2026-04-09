"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppointmentDetailPanel } from "@/app/(app)/appointments/_components/AppointmentDetailPanel";
import type {
  AppointmentCreateInitialValues,
  AppointmentSelectOption,
} from "@/types/appointment";

type Props = {
  doctorOptions: AppointmentSelectOption[];
  initialValues?: AppointmentCreateInitialValues;
};

export function NewAppointmentModalClient({
  doctorOptions,
  initialValues,
}: Props) {
  const router = useRouter();
  const handleClose = useCallback(() => router.back(), [router]);

  return (
    <AppointmentDetailPanel
      mode="create"
      doctorOptions={doctorOptions}
      initialValues={initialValues}
      onClose={handleClose}
    />
  );
}
