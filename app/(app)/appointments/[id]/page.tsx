/**
 * app/(app)/appointments/[id]/page.tsx
 *
 * Full-page fallback for appointment detail.
 * Shown on direct URL access / hard refresh of /appointments/[id].
 * During normal in-app navigation the intercepting modal takes over.
 */

import { notFound } from "next/navigation";
import { getMockAppointmentDetail } from "@/mock/appointments/detail";
import { AppointmentDetailPanel } from "../_components/AppointmentDetailPanel";

interface AppointmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  const { id } = await params;
  const appointment = getMockAppointmentDetail(id);

  if (!appointment) notFound();

  return (
    <div className="p-8 h-full flex flex-col">
      <p
        className="text-xs font-medium mb-6"
        style={{ color: "var(--color-text-muted)" }}
      >
        Appointments › {appointment.title}
      </p>

      <div
        className="flex-1 rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-glass-fill-data)",
          border:     "1px solid var(--color-border)",
          boxShadow:  "var(--shadow-card)",
        }}
      >
        <AppointmentDetailPanel mode="edit" appointment={appointment} />
      </div>
    </div>
  );
}
