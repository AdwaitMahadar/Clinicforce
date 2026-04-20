"use client";

/**
 * Patient detail "Prescriptions" tab — read-only list of published prescriptions across visits.
 * Rows navigate to `/appointments/view/[id]` (drafts are not listed; they only exist on the appointment).
 */

import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatPrescriptionChartId } from "@/lib/utils/chart-id";
import type { PatientPrescriptionSummary } from "@/types/patient";

export interface PatientPrescriptionsTabProps {
  patientId: string;
  initialPrescriptions: PatientPrescriptionSummary[];
}

function formatVisitDateTime(iso: string): { date: string; time: string } {
  try {
    const d = parseISO(iso);
    return {
      date: format(d, "MMM d, yyyy"),
      time: format(d, "hh:mm a"),
    };
  } catch {
    return { date: "—", time: "" };
  }
}

function medicineCountLabel(n: number): string {
  if (n <= 0) return "No medicines";
  return n === 1 ? "1 medicine" : `${n} medicines`;
}

export function PatientPrescriptionsTab({
  patientId,
  initialPrescriptions,
}: PatientPrescriptionsTabProps) {
  const router = useRouter();

  if (initialPrescriptions.length === 0) {
    return (
      <div
        className="text-center py-10 px-2 space-y-2"
        data-patient-id={patientId}
      >
        <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
          No published prescriptions yet.
        </p>
        <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          This list shows only published prescriptions. Drafts stay on the appointment until
          they are published — open the visit to view or complete them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-patient-id={patientId}>
      {initialPrescriptions.map((rx) => {
        const { date, time } = formatVisitDateTime(rx.scheduledAt);
        return (
          <button
            key={rx.id}
            type="button"
            onClick={() => router.push(`/appointments/view/${rx.appointmentId}`)}
            className="w-full text-left flex items-stretch gap-3 p-3 rounded-xl cursor-pointer transition-all group"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="min-w-0 flex-1 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="font-mono text-xs font-semibold shrink-0 px-2 py-0.5 rounded-md"
                  style={{
                    background: "var(--color-surface-alt)",
                    color: "var(--color-text-secondary)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {formatPrescriptionChartId(rx.chartId)}
                </span>
                <span
                  className="text-[10px] font-medium shrink-0"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {medicineCountLabel(rx.activeItemCount)}
                </span>
              </div>
              <p
                className="text-sm font-semibold truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {rx.doctorName}
              </p>
              <div
                className="flex items-center gap-4 text-xs"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} aria-hidden />
                  {date}
                </span>
                {time ? <span>{time}</span> : null}
              </div>
            </div>
            <div
              className="flex items-center shrink-0 self-center opacity-50 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-text-muted)" }}
              aria-hidden
            >
              <ChevronRight size={18} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
