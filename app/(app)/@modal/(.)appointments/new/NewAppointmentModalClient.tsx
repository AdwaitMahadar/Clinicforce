"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppointmentDetailPanel } from "@/app/(app)/appointments/_components/AppointmentDetailPanel";

export function NewAppointmentModalClient() {
  const router = useRouter();
  const handleClose = useCallback(() => router.back(), [router]);

  return <AppointmentDetailPanel mode="create" onClose={handleClose} />;
}
