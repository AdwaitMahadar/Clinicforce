"use client";

/**
 * app/(app)/@modal/(.)appointments/[id]/page.tsx
 *
 * Intercepting modal for viewing/editing an existing appointment.
 * Triggered by clicking an event chip in any calendar view.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getMockAppointmentDetail } from "@/mock/appointments/detail";
import { AppointmentDetailPanel } from "@/app/(app)/appointments/_components/AppointmentDetailPanel";
import { ModalShell } from "@/components/common/ModalShell";

interface Props {
  params: Promise<{ id: string }>;
}

export default function InterceptedAppointmentModal({ params }: Props) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<ReturnType<typeof getMockAppointmentDetail>>(null);

  useEffect(() => {
    params.then(({ id }) => setAppointment(getMockAppointmentDetail(id)));
  }, [params]);

  const handleClose = useCallback(() => router.back(), [router]);

  if (!appointment) return null;

  return (
    <ModalShell size="xl" label={`Edit: ${appointment.title}`}>
      <AppointmentDetailPanel
        mode="edit"
        appointment={appointment}
        onClose={handleClose}
      />
    </ModalShell>
  );
}
