"use client";

/**
 * Detail panel "Appointments" tab — visit cards: non-current rows accordion-expand for
 * extra read-only fields; the **current** visit is a flat summary only (no **Open** pill).
 * **Open** pill + status on the header top row; chevron on the date/time row, full-width.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, ExternalLink } from "lucide-react";
import type { PatientAppointment } from "@/types/patient";
import {
  APPOINTMENT_CATEGORY_LABELS,
  APPOINTMENT_VISIT_TYPE_LABELS,
  type AppointmentCategory,
  type AppointmentVisitType,
} from "@/lib/constants/appointment";
import { formatAppointmentFeeInr } from "@/lib/utils/format-appointment-fee";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

function categoryLabel(category: string): string {
  return APPOINTMENT_CATEGORY_LABELS[category as AppointmentCategory] ?? category;
}

function visitTypeLabel(visitType: string): string {
  return APPOINTMENT_VISIT_TYPE_LABELS[visitType as AppointmentVisitType] ?? visitType;
}

function displayBlock(text: string | null | undefined): string {
  const t = text?.trim();
  return t ? t : "—";
}

function cardShellStyle(isCurrent: boolean) {
  return {
    background: "var(--color-glass-fill-data)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid",
    borderColor: isCurrent ? "var(--color-blue-border)" : "var(--color-border)",
    boxShadow: "var(--shadow-card)",
  } as const;
}

function StatusChip({ status }: { status: string }) {
  const s = APPT_STATUS_STYLES[status] ?? APPT_STATUS_STYLES.completed;
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap capitalize shrink-0"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  );
}

function OpenVisitPill({ heading, appointmentId }: { heading: string; appointmentId: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/appointments/view/${appointmentId}`);
      }}
      className={cn(
        "cursor-pointer inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0",
        "transition-[background-color,border-color,opacity] duration-150",
        "hover:opacity-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-glass-fill-data)]"
      )}
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface-alt)",
        color: "var(--color-text-secondary)",
      }}
      aria-label={`Open appointment ${heading}`}
    >
      <ExternalLink className="size-2.5 shrink-0 opacity-80" aria-hidden strokeWidth={2.25} />
      Open
    </button>
  );
}

function AppointmentExpandedDetails({ appt }: { appt: PatientAppointment }) {
  const muted = "var(--color-text-muted)";
  const primary = "var(--color-text-primary)";
  const labelCls = "text-[10px] font-semibold uppercase tracking-wide";

  return (
    <div className="px-4 pb-4 pt-3 space-y-3">
      <div className="grid min-w-0 grid-cols-3 gap-3 sm:gap-4">
        <div className="grid min-w-0 gap-0.5">
          <span className={labelCls} style={{ color: muted }}>
            Category
          </span>
          <span className="text-sm break-words" style={{ color: primary }}>
            {categoryLabel(appt.category)}
          </span>
        </div>
        <div className="grid min-w-0 gap-0.5">
          <span className={labelCls} style={{ color: muted }}>
            Visit type
          </span>
          <span className="text-sm break-words" style={{ color: primary }}>
            {visitTypeLabel(appt.visitType)}
          </span>
        </div>
        <div className="grid min-w-0 gap-0.5">
          <span className={labelCls} style={{ color: muted }}>
            Fee
          </span>
          <span className="text-sm tabular-nums" style={{ color: primary }}>
            {formatAppointmentFeeInr(appt.fee)}
          </span>
        </div>
      </div>
      <div className="grid gap-0.5">
        <span className={labelCls} style={{ color: muted }}>
          Description
        </span>
        <p className="text-sm whitespace-pre-wrap" style={{ color: primary }}>
          {displayBlock(appt.description)}
        </p>
      </div>
      <div className="grid gap-0.5">
        <span className={labelCls} style={{ color: muted }}>
          Clinical notes
        </span>
        <p className="text-sm whitespace-pre-wrap" style={{ color: primary }}>
          {displayBlock(appt.clinicalNotes)}
        </p>
      </div>
    </div>
  );
}

function AppointmentCurrentCard({ appt }: { appt: PatientAppointment }) {
  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ ...cardShellStyle(true), opacity: appt.status === "cancelled" ? 0.7 : 1 }}
      aria-current="page"
    >
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <p
              className="text-sm font-bold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {appt.heading}
            </p>
            <Badge
              variant="outline"
              className="pointer-events-none h-auto shrink-0 border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{
                background: "var(--color-blue-bg)",
                color: "var(--color-blue)",
                borderColor: "var(--color-blue-border)",
              }}
            >
              Current
            </Badge>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {appt.doctor}
          </p>
          <div
            className="mt-1.5 flex w-full flex-wrap items-center gap-x-4 gap-y-0.5 text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span className="flex shrink-0 items-center gap-1">
              <CalendarDays size={12} aria-hidden />
              {appt.date}
            </span>
            <span className="shrink-0">{appt.time}</span>
          </div>
        </div>
        <div className="shrink-0 self-start pt-0.5">
          <StatusChip status={appt.status} />
        </div>
      </div>
    </div>
  );
}

function AppointmentAccordionRow({ appt }: { appt: PatientAppointment }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ ...cardShellStyle(false), opacity: appt.status === "cancelled" ? 0.7 : 1 }}
    >
      <button
        type="button"
        className="w-full text-left p-3"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-bold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {appt.heading}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 self-start pt-0.5">
            <OpenVisitPill heading={appt.heading} appointmentId={appt.id} />
            <StatusChip status={appt.status} />
          </div>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {appt.doctor}
        </p>
        <div
          className="mt-1.5 flex w-full min-w-0 items-center justify-between gap-2 text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-0.5">
            <span className="flex shrink-0 items-center gap-1">
              <CalendarDays size={12} aria-hidden />
              {appt.date}
            </span>
            <span className="shrink-0">{appt.time}</span>
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

      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 250ms ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <AppointmentExpandedDetails appt={appt} />
        </div>
      </div>
    </div>
  );
}

export function AppointmentListTab({
  appointments,
  currentAppointmentId,
  emptyMessage,
}: AppointmentListTabProps) {
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
        return isCurrent ? (
          <AppointmentCurrentCard key={appt.id} appt={appt} />
        ) : (
          <AppointmentAccordionRow key={appt.id} appt={appt} />
        );
      })}
    </div>
  );
}
