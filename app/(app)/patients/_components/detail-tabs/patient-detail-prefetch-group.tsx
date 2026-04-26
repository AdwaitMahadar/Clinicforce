import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import {
  PatientPrefetchAppointments,
  PatientPrefetchDocuments,
  PatientPrefetchPrescriptions,
} from "./patient-detail-tab-prefetch";

/** Prescriptions prefetch only when `viewPrescriptions` — same gate as `prescriptionsTab` on view routes. */
export async function PatientDetailPrefetchGroup({ patientId }: { patientId: string }) {
  const session = await getSession();
  const prefetchPrescriptions = hasPermission(session.user.type, "viewPrescriptions");

  return (
    <>
      <Suspense fallback={null}>
        <PatientPrefetchDocuments patientId={patientId} />
      </Suspense>
      <Suspense fallback={null}>
        <PatientPrefetchAppointments patientId={patientId} />
      </Suspense>
      {prefetchPrescriptions ? (
        <Suspense fallback={null}>
          <PatientPrefetchPrescriptions patientId={patientId} />
        </Suspense>
      ) : null}
    </>
  );
}
