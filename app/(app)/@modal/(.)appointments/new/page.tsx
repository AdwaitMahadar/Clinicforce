"use client";

/**
 * app/(app)/@modal/(.)appointments/new/page.tsx
 *
 * Intercepting modal for creating a new appointment.
 * Triggered by the "New Appt" button on the appointments dashboard.
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppointmentDetailPanel } from "@/app/(app)/appointments/_components/AppointmentDetailPanel";
import { ModalShell } from "@/components/common/ModalShell";

export default function NewAppointmentModal() {
  const router = useRouter();
  const handleClose = useCallback(() => router.back(), [router]);

  return (
    <ModalShell size="xl" label="New Appointment">
      <AppointmentDetailPanel mode="create" onClose={handleClose} />
    </ModalShell>
  );
}
