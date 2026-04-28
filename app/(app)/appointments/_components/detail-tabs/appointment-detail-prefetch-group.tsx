import { hasPermission } from "@/lib/permissions";
import {
  fetchAppointmentDetailAppointmentsTabCached,
  fetchAppointmentDetailDocumentsTabCached,
  fetchAppointmentDetailPrescriptionsTabCached,
} from "@/lib/detail-tab-fetch-cache";
import { ParallelTabDataPrefetch } from "@/lib/parallel-tab-data-prefetch";

/**
 * Invisible parallel warm-up for appointment detail tab slices.
 * Documents + appointments list only when `viewDetailSidebar` (matches `DetailPanel`).
 * Prescriptions only when `viewPrescriptions` (matches routes + panel).
 */
export async function AppointmentDetailPrefetchGroup({
  appointmentId,
}: {
  appointmentId: string;
}) {
  return (
    <ParallelTabDataPrefetch
      slices={[
        {
          key: "documents",
          when: (s) => hasPermission(s.user.type, "viewDetailSidebar"),
          prefetch: () => fetchAppointmentDetailDocumentsTabCached(appointmentId),
        },
        {
          key: "appointments",
          when: (s) => hasPermission(s.user.type, "viewDetailSidebar"),
          prefetch: () => fetchAppointmentDetailAppointmentsTabCached(appointmentId),
        },
        {
          key: "prescriptions",
          when: (s) => hasPermission(s.user.type, "viewPrescriptions"),
          prefetch: () => fetchAppointmentDetailPrescriptionsTabCached(appointmentId),
        },
      ]}
    />
  );
}
