"use client";

/**
 * Patient detail "Prescriptions" tab — accordion list of published prescriptions.
 * Each row expands inline to show a clinical ℞ document. No navigation to appointment.
 */

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, ChevronDown, Moon, Pill, Stethoscope, Sun, Sunrise } from "lucide-react";
import { formatPrescriptionChartId } from "@/lib/utils/chart-id";
import type { PatientPrescriptionSummary } from "@/types/patient";
import type { PrescriptionItemForAppointmentTab } from "@/types/prescription";

/* ─────────────────────────────────────────────────────────────
   Slot config (duplicated from PrescriptionsTab for isolation)
───────────────────────────────────────────────────────────── */

const SLOTS = [
  {
    key:     "morning"   as const,
    enabled: "morningEnabled"   as const,
    qty:     "morningQuantity"  as const,
    timing:  "morningTiming"    as const,
    label:   "Morning",
    Icon:    Sunrise,
    color: {
      active: "var(--color-amber-bg)",
      border: "var(--color-amber-border)",
      text:   "var(--color-amber)",
    },
  },
  {
    key:     "afternoon" as const,
    enabled: "afternoonEnabled"   as const,
    qty:     "afternoonQuantity"  as const,
    timing:  "afternoonTiming"    as const,
    label:   "Afternoon",
    Icon:    Sun,
    color: {
      active: "var(--color-blue-bg)",
      border: "var(--color-blue-border)",
      text:   "var(--color-blue)",
    },
  },
  {
    key:     "night" as const,
    enabled: "nightEnabled"   as const,
    qty:     "nightQuantity"  as const,
    timing:  "nightTiming"    as const,
    label:   "Night",
    Icon:    Moon,
    color: {
      active: "var(--color-purple-bg)",
      border: "var(--color-purple-border)",
      text:   "var(--color-purple)",
    },
  },
] as const;

/* ─────────────────────────────────────────────────────────────
   RxDocument — inline prescription document (read-only)
───────────────────────────────────────────────────────────── */

function RxDocument({
  items,
  notes,
}: {
  items: PrescriptionItemForAppointmentTab[];
  notes?: string | null;
}) {
  return (
    <div
      className="border-t px-5 py-4"
      style={{ borderColor: "var(--color-glass-border)", background: "var(--color-surface)" }}
    >
      {/* ℞ divider */}
      <div className="mb-4 flex items-center gap-3">
        <span
          className="text-2xl font-light leading-none select-none"
          style={{ color: "var(--color-text-muted)", fontFamily: "serif" }}
          aria-hidden
        >
          ℞
        </span>
        <div className="flex-1 border-t" style={{ borderColor: "var(--color-border)" }} />
      </div>

      {/* Medicine lines — two-column: name+remarks left, doses+duration right */}
      {items.length > 0 ? (
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
          {items.map((item, idx) => {
            const activeSlots = SLOTS.filter(s => item[s.enabled]);
            return (
              <div key={item.id} className="grid grid-cols-[1fr_auto] items-start gap-4 py-3">
                {/* LEFT: index + medicine name + remarks */}
                <div className="min-w-0 flex items-start gap-2">
                  <span
                    className="mt-0.5 shrink-0 text-xs font-bold tabular-nums"
                    style={{ color: "var(--color-text-muted)", minWidth: "1rem" }}
                  >
                    {idx + 1}.
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {item.displayMedicineName}
                    </p>
                    {item.remarks?.trim() && (
                      <p className="mt-0.5 text-xs italic" style={{ color: "var(--color-text-secondary)" }}>
                        {item.remarks}
                      </p>
                    )}
                  </div>
                </div>

                {/* RIGHT: dose pills + duration */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {activeSlots.length > 0 ? (
                    <div className="flex flex-wrap justify-end gap-1">
                      {activeSlots.map(s => {
                        const qty  = item[s.qty];
                        const meal = item[s.timing] === "after_food" ? "After" : "Before";
                        return (
                          <span
                            key={s.key}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                            style={{
                              background: s.color.active,
                              border: `1px solid ${s.color.border}`,
                              color: s.color.text,
                            }}
                          >
                            <s.Icon className="size-2.5 shrink-0" aria-hidden />
                            ×{qty}
                            <span style={{ opacity: 0.75 }}>{meal}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[11px] italic" style={{ color: "var(--color-text-muted)" }}>No doses</span>
                  )}
                  {item.duration?.trim() && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                    >
                      <span className="font-semibold" style={{ color: "var(--color-text-secondary)" }}>for</span>
                      {item.duration} days
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No medicines on this prescription.</p>
      )}

      {/* Notes */}
      {(notes !== undefined) && (
        <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
          <p
            className="mb-1 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-text-muted)" }}
          >
            Notes
          </p>
          <p
            className="text-sm whitespace-pre-wrap"
            style={{ color: notes?.trim() ? "var(--color-text-primary)" : "var(--color-text-muted)" }}
          >
            {notes?.trim() || "—"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   RxAccordionItem — one prescription accordion card
───────────────────────────────────────────────────────────── */

function RxAccordionItem({ rx }: { rx: PatientPrescriptionSummary }) {
  const [open, setOpen] = useState(false);

  let visitDate = "—";
  try { visitDate = format(parseISO(rx.scheduledAt), "MMM d, yyyy"); } catch {}

  const count = rx.activeItemCount;
  const medicineLabel = count === 1 ? "1 medicine" : `${count} medicines`;

  return (
    <div
      className="overflow-hidden rounded-xl transition-shadow"
      style={{
        background: "var(--color-glass-fill-data)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid var(--color-glass-border)",
      }}
    >
      {/* Accordion header — balanced left/right */}
      <button
        type="button"
        className="w-full grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[color:var(--color-surface-alt)]/60"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {/* Left: Rx ID (small reference) then doctor name (bigger primary) */}
        <div className="min-w-0 space-y-0.5">
          <span className="font-mono text-[10px] font-bold" style={{ color: "var(--color-text-muted)" }}>
            {formatPrescriptionChartId(rx.chartId)}
          </span>
          <div className="flex items-center gap-1.5">
            <Stethoscope className="size-3.5 shrink-0" style={{ color: "var(--color-text-muted)" }} aria-hidden />
            <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {rx.doctorName}
            </p>
          </div>
        </div>

        {/* Right: date + medicine count + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
              style={{
                background: "var(--color-green-bg)",
                border: "1px solid var(--color-green-border)",
                color: "var(--color-green)",
              }}
            >
              {medicineLabel}
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              <CalendarDays className="size-3 shrink-0" aria-hidden />
              {visitDate}
            </span>
          </div>
          <ChevronDown
            className="size-4 shrink-0 transition-transform duration-200"
            style={{
              color: "var(--color-text-muted)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
            aria-hidden
          />
        </div>
      </button>

      {/* Expandable body */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 250ms ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <RxDocument items={rx.items} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PatientPrescriptionsTab
───────────────────────────────────────────────────────────── */

export interface PatientPrescriptionsTabProps {
  patientId: string;
  initialPrescriptions: PatientPrescriptionSummary[];
}

export function PatientPrescriptionsTab({ patientId, initialPrescriptions }: PatientPrescriptionsTabProps) {
  if (initialPrescriptions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-xl py-14 px-6 text-center"
        data-patient-id={patientId}
        style={{
          background: "var(--color-glass-fill-data)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid var(--color-glass-border)",
        }}
      >
        <div
          className="flex size-11 items-center justify-center rounded-full"
          style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border)" }}
        >
          <Pill className="size-5" style={{ color: "var(--color-text-muted)" }} aria-hidden />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            No published prescriptions
          </p>
          <p className="text-xs max-w-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            Published prescriptions from this patient's visits will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-patient-id={patientId}>
      {initialPrescriptions.map(rx => (
        <RxAccordionItem key={rx.id} rx={rx} />
      ))}
    </div>
  );
}
