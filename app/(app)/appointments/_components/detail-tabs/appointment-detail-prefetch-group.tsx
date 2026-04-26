import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import {
  AppointmentPrefetchAppointments,
  AppointmentPrefetchDocuments,
  AppointmentPrefetchPrescriptions,
} from "./appointment-detail-tab-prefetch";

/**
 * Invisible parallel warm-up for tab `React.cache` slices — compose as sibling of the detail panel.
 * Prescriptions prefetch runs only when the session has `viewPrescriptions` (admin/doctor), matching routes.
 */
export async function AppointmentDetailPrefetchGroup({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const session = await getSession();
  const prefetchPrescriptions = hasPermission(session.user.type, "viewPrescriptions");

  return (
    <>
      <Suspense fallback={null}>
        <AppointmentPrefetchDocuments appointmentId={appointmentId} />
      </Suspense>
      <Suspense fallback={null}>
        <AppointmentPrefetchAppointments appointmentId={appointmentId} />
      </Suspense>
      {prefetchPrescriptions ? (
        <Suspense fallback={null}>
          <AppointmentPrefetchPrescriptions appointmentId={appointmentId} />
        </Suspense>
      ) : null}
    </>
  );
}
