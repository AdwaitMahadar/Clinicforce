"use client";

/**
 * Detail panel "Appointments" tab — visit cards: non-current rows accordion-expand for
 * extra read-only fields; **current** visit is a flat summary (no **Open** in the body).
 * Accordion: full-width header **`button`** (heading + status chip + date row + chevron); expanded
 * row matches **`PatientOpenPill`** sizing (`ROW_CHIP_SHELL` / **`OpenAppointmentPill`**). **Current** = Shadcn **`Badge`**.
 */

import { useState, type CSSProperties } from "react";
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
import {
  CATEGORY_COLORS,
  VALID_APPOINTMENT_CATEGORIES,
} from "@/lib/appointment-calendar-styles";

const APPT_STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: { bg: "var(--color-amber-bg)", text: "var(--color-amber)", border: "var(--color-amber-border)" },
  completed: { bg: "var(--color-blue-bg)", text: "var(--color-blue)", border: "var(--color-blue-border)" },
  cancelled: { bg: "var(--color-red-bg)", text: "var(--color-red)", border: "var(--color-red-border)" },
  "no-show": { bg: "var(--color-purple-bg)", text: "var(--color-purple)", border: "var(--color-purple-border)" },
};

/** Visit-type chips — distinct tokens from category calendar colours (visit `general` ≠ category `general`). */
const VISIT_TYPE_CHIP_STYLES: Record<
  AppointmentVisitType,
  { bg: string; text: string; border: string }
> = {
  general: {
    bg: "var(--color-surface-alt)",
    text: "var(--color-text-secondary)",
    border: "var(--color-border)",
  },
  "first-visit": {
    bg: "var(--color-green-bg)",
    text: "var(--color-green)",
    border: "var(--color-green-border)",
  },
  "follow-up-visit": {
    bg: "var(--color-purple-bg)",
    text: "var(--color-purple)",
    border: "var(--color-purple-border)",
  },
};

type ChipSurface = { bg: string; text: string; border: string };

/** Layout shell shared with `PatientOpenPill` / `OpenAppointmentPill` (`px-2.5`). */
const ROW_CHIP_SHELL =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0";

const READONLY_ROW_CHIP = cn(ROW_CHIP_SHELL, "pointer-events-none max-w-full min-w-0");

const NEUTRAL_OPEN_SURFACE: ChipSurface = {
  bg: "var(--color-surface-alt)",
  text: "var(--color-text-secondary)",
  border: "var(--color-border)",
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

function chipStyle(surface: ChipSurface): CSSProperties {
  return { background: surface.bg, color: surface.text, borderColor: surface.border };
}

function StatusChip({ status }: { status: string }) {
  const s = APPT_STATUS_STYLES[status] ?? APPT_STATUS_STYLES.completed;
  const surface: ChipSurface = { bg: s.bg, text: s.text, border: s.border };
  return (
    <span className={cn(READONLY_ROW_CHIP, "capitalize")} style={chipStyle(surface)}>
      {status}
    </span>
  );
}

/** Same Open control as `PatientOpenPill` in `AppointmentPatientSummaryCard`. */
function OpenAppointmentPill({ appointmentId, heading }: { appointmentId: string; heading: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/appointments/view/${appointmentId}`)}
      className={cn(
        ROW_CHIP_SHELL,
        "cursor-pointer transition-[background-color,border-color,opacity] duration-150",
        "hover:opacity-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-border) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-surface)"
      )}
      style={chipStyle(NEUTRAL_OPEN_SURFACE)}
      aria-label={`Open appointment ${heading}`}
    >
      <ExternalLink className="size-2.5 shrink-0 opacity-80" aria-hidden strokeWidth={2.25} />
      Open
    </button>
  );
}

function MetaLabeledChip({ label, value, surface }: { label: string; value: string; surface: ChipSurface }) {
  return (
    <span className={READONLY_ROW_CHIP} style={chipStyle(surface)}>
      <span className="shrink-0 opacity-70">{label}</span>
      <span className="min-w-0 truncate">{value}</span>
    </span>
  );
}

function AppointmentExpandedMetaRow({ appt }: { appt: PatientAppointment }) {
  const catKey = (VALID_APPOINTMENT_CATEGORIES.has(appt.category) ? appt.category : "general") as AppointmentCategory;
  const c = CATEGORY_COLORS[catKey];
  const visit =
    VISIT_TYPE_CHIP_STYLES[appt.visitType as AppointmentVisitType] ?? VISIT_TYPE_CHIP_STYLES.general;

  return (
    <div className="flex w-full min-w-0 flex-nowrap items-center justify-between gap-x-2 overflow-x-auto scrollbar-hover">
      <MetaLabeledChip label="Category" value={categoryLabel(appt.category)} surface={{ bg: c.bg, text: c.text, border: c.border }} />
      <MetaLabeledChip label="Visit type" value={visitTypeLabel(appt.visitType)} surface={visit} />
      <span className={READONLY_ROW_CHIP} style={chipStyle(NEUTRAL_OPEN_SURFACE)}>
        <span className="shrink-0 opacity-70">Fee</span>
        <span className="tabular-nums" style={{ color: "var(--color-text-primary)" }}>
          {formatAppointmentFeeInr(appt.fee)}
        </span>
      </span>
      <OpenAppointmentPill appointmentId={appt.id} heading={appt.heading} />
    </div>
  );
}

function AppointmentExpandedDetails({ appt }: { appt: PatientAppointment }) {
  const muted = "var(--color-text-muted)";
  const primary = "var(--color-text-primary)";
  const labelCls = "text-[10px] font-semibold uppercase tracking-wide";

  return (
    <div className="px-4 pb-4 pt-3 space-y-3">
      <AppointmentExpandedMetaRow appt={appt} />
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
        className="w-full text-left p-3 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-border) focus-visible:ring-inset"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold truncate min-w-0 pr-1" style={{ color: "var(--color-text-primary)" }}>
            {appt.heading}
          </p>
          <StatusChip status={appt.status} />
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
