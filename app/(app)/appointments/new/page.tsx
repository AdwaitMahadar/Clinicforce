/**
 * app/(app)/appointments/new/page.tsx
 *
 * Full-page fallback for creating a new appointment.
 * Shown on direct URL access / hard refresh of /appointments/new.
 * During normal in-app navigation the intercepting modal takes over.
 */

import { AppointmentDetailPanel } from "../_components/AppointmentDetailPanel";

export default function NewAppointmentPage() {
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="max-w-[1700px] mx-auto w-full flex-1 min-h-0 flex flex-col">
        <p
          className="text-xs font-medium mb-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          Appointments › New Appointment
        </p>

        <div
          className="flex-1 rounded-2xl overflow-hidden min-h-0"
          style={{
            background: "var(--color-glass-fill-data)",
            border:     "1px solid var(--color-border)",
            boxShadow:  "var(--shadow-card)",
          }}
        >
          <AppointmentDetailPanel mode="create" />
        </div>
      </div>
    </div>
  );
}
