/**
 * app/(app)/appointments/view/[id]/page.tsx
 *
 * Full-page fallback for appointment detail.
 * Shown on direct URL access / hard refresh of /appointments/view/[id].
 * During normal in-app navigation the intercepting modal takes over.
 */

import { notFound } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { loadAppointmentDetailViewData } from "../../_lib/appointment-detail-view-data";
import { DetailPageShell } from "@/components/layout/DetailPageShell";
import { AppointmentDetailPanel } from "../../_components/AppointmentDetailPanel";
import { AppointmentDetailPrefetchGroup } from "../../_components/detail-tabs/appointment-detail-prefetch-group";
import {
  AppointmentAppointmentsTabLoader,
  AppointmentDocumentsTabLoader,
  AppointmentPrescriptionsTabLoader,
} from "../../_components/detail-tabs/appointment-detail-tab-loaders";
import { formatAppointmentHeading } from "@/lib/utils/format-appointment-heading";

interface AppointmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  const { id } = await params;
  const [session, payload] = await Promise.all([getSession(), loadAppointmentDetailViewData(id)]);

  if (!payload) notFound();

  const { appointment, doctorOptions } = payload;
  const showPrescriptionsTab = hasPermission(session.user.type, "viewPrescriptions");

  const t = appointment.title?.trim();
  const breadcrumbLabel = t
    ? t
    : formatAppointmentHeading({
        category:  appointment.category,
        visitType: appointment.visitType,
        title:     null,
      });

  return (
    <DetailPageShell breadcrumb={`Appointments › ${breadcrumbLabel}`}>
      <>
        <AppointmentDetailPrefetchGroup appointmentId={id} />
        <AppointmentDetailPanel
          mode="edit"
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
    </DetailPageShell>
  );
}
