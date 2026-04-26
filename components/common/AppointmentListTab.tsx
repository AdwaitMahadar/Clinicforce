"use client";

/**
 * Detail panel "Appointments" tab — patient visit cards with navigation to `/appointments/view/[id]`.
 * Optional `currentAppointmentId` shows a **Current** badge (+ blue border) on that row (appointment detail context only).
 */

import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import type { PatientAppointment } from "@/types/patient";

const APPT_STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: { bg: "var(--color-amber-bg)", text: "var(--color-amber)", border: "var(--color-amber-border)" },
  completed: { bg: "var(--color-blue-bg)", text: "var(--color-blue)", border: "var(--color-blue-border)" },
  cancelled: { bg: "var(--color-red-bg)", text: "var(--color-red)", border: "var(--color-red-border)" },
  "no-show": { bg: "var(--color-purple-bg)", text: "var(--color-purple)", border: "var(--color-purple-border)" },
};

export interface AppointmentListTabProps {
  appointments: PatientAppointment[];
  /** When set (e.g. on appointment detail), the matching row shows a **Current** badge and highlight border. */
  currentAppointmentId?: string;
  /** Empty-state copy when there are no appointments. */
  emptyMessage: string;
}

export function AppointmentListTab({
  appointments,
  currentAppointmentId,
  emptyMessage,
}: AppointmentListTabProps) {
  const router = useRouter();

  if (appointments.length === 0) {
    return (
      <p className="text-sm text-center py-10" style={{ color: "var(--color-text-muted)" }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appt) => {
        const isCurrent =
          currentAppointmentId !== undefined && appt.id === currentAppointmentId;
        const s = APPT_STATUS_STYLES[appt.status] ?? APPT_STATUS_STYLES.completed;
        const cardStyle = {
          background: "var(--color-glass-fill-data)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid",
          borderColor: isCurrent ? "var(--color-blue-border)" : "var(--color-border)",
          boxShadow: "var(--shadow-card)",
          opacity: appt.status === "cancelled" ? 0.7 : 1,
        } as const;

        return (
          <button
            key={appt.id}
            type="button"
            onClick={() => router.push(`/appointments/view/${appt.id}`)}
            className="w-full text-left flex flex-col gap-2 p-3 rounded-xl cursor-pointer transition-all"
            style={cardStyle}
            aria-current={isCurrent ? "page" : undefined}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p
                    className="text-sm font-bold truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {appt.heading}
                  </p>
                  {isCurrent && (
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wide shrink-0 px-1.5 py-0.5 rounded"
                      style={{
                        background: "var(--color-blue-bg)",
                        color: "var(--color-blue)",
                        border: "1px solid var(--color-blue-border)",
                      }}
                    >
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {appt.doctor}
                </p>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 capitalize"
                style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
              >
                {appt.status}
              </span>
            </div>
            <div
              className="flex items-center gap-4 text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <span className="flex items-center gap-1">
                <CalendarDays size={12} aria-hidden />
                {appt.date}
              </span>
              <span>{appt.time}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
