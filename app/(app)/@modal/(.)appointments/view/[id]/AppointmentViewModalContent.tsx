import { notFound } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { loadAppointmentDetailViewData } from "@/app/(app)/appointments/_lib/appointment-detail-view-data";
import { AppointmentViewModalClient } from "./AppointmentViewModalClient";
import { AppointmentDetailPrefetchGroup } from "@/app/(app)/appointments/_components/detail-tabs/appointment-detail-prefetch-group";
import {
  AppointmentAppointmentsTabLoader,
  AppointmentDocumentsTabLoader,
  AppointmentPrescriptionsTabLoader,
} from "@/app/(app)/appointments/_components/detail-tabs/appointment-detail-tab-loaders";

export async function AppointmentViewModalContent({ id }: { id: string }) {
  const [session, payload] = await Promise.all([getSession(), loadAppointmentDetailViewData(id)]);

  if (!payload) notFound();

  const { appointment, doctorOptions } = payload;
  const showPrescriptionsTab = hasPermission(session.user.type, "viewPrescriptions");

  return (
    <>
      <AppointmentDetailPrefetchGroup appointmentId={id} />
      <AppointmentViewModalClient
        appointment={appointment}
        doctorOptions={doctorOptions}
        documentsTab={
          <AppointmentDocumentsTabLoader appointmentId={id} patientId={appointment.patientId} />
        }
        appointmentsTab={<AppointmentAppointmentsTabLoader appointmentId={id} />}
        prescriptionsTab={
          showPrescriptionsTab ? (
            <AppointmentPrescriptionsTabLoader appointmentId={id} />
          ) : undefined
        }
      />
    </>
  );
}
