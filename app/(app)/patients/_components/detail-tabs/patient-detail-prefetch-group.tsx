import { hasPermission } from "@/lib/permissions";
import {
  fetchPatientDetailAppointmentsTabCached,
  fetchPatientDetailDocumentsTabCached,
  fetchPatientDetailPrescriptionsTabCached,
} from "@/lib/detail-tab-fetch-cache";
import { ParallelTabDataPrefetch } from "@/lib/parallel-tab-data-prefetch";

/**
 * Invisible parallel warm-up for patient detail tab slices.
 * Documents + appointments only when `viewDetailSidebar` (matches `DetailPanel`).
 * Prescriptions only when `viewPrescriptions` (matches routes + panel).
 */
export async function PatientDetailPrefetchGroup({ patientId }: { patientId: string }) {
  return (
    <ParallelTabDataPrefetch
      slices={[
        {
          key: "documents",
          when: (s) => hasPermission(s.user.type, "viewDetailSidebar"),
          prefetch: () => fetchPatientDetailDocumentsTabCached(patientId),
        },
        {
          key: "appointments",
          when: (s) => hasPermission(s.user.type, "viewDetailSidebar"),
          prefetch: () => fetchPatientDetailAppointmentsTabCached(patientId),
        },
        {
          key: "prescriptions",
          when: (s) => hasPermission(s.user.type, "viewPrescriptions"),
          prefetch: () => fetchPatientDetailPrescriptionsTabCached(patientId),
        },
      ]}
    />
  );
}
