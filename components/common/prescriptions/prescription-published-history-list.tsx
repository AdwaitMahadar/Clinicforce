"use client";

/**
 * Read-only accordion rows for published prescription summaries (patient tab + appointment tab history).
 * Card chrome: `1px solid var(--color-border)` (aligned with draft line / shell outlines).
 * No navigation to appointments — inline ℞ only.
 */

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, ChevronDown, Stethoscope } from "lucide-react";
import { formatPrescriptionChartId } from "@/lib/utils/chart-id";
import type { PatientPrescriptionSummary } from "@/types/patient";
import { RxClinicalDocument } from "@/components/common/prescriptions/rx-clinical-document";

function PrescriptionHistoryAccordionItem({ rx }: { rx: PatientPrescriptionSummary }) {
  const [open, setOpen] = useState(false);

  let visitDate = "—";
  try {
    visitDate = format(parseISO(rx.scheduledAt), "MMM d, yyyy");
  } catch {
    /* keep — */
  }

  const count = rx.activeItemCount;
  const medicineLabel = count === 1 ? "1 medicine" : `${count} medicines`;

  return (
    <div
      className="overflow-hidden rounded-xl transition-shadow"
      style={{
        background: "var(--color-glass-fill-data)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid var(--color-border)",
      }}
    >
      <button
        type="button"
        className="w-full grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[color:var(--color-surface-alt)]/60"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="min-w-0 space-y-0.5">
          <span
            className="font-mono text-[10px] font-bold"
            style={{ color: "var(--color-text-muted)" }}
          >
            {formatPrescriptionChartId(rx.chartId)}
          </span>
          <div className="flex items-center gap-1.5">
            <Stethoscope
              className="size-3.5 shrink-0"
              style={{ color: "var(--color-text-muted)" }}
              aria-hidden
            />
            <p
              className="truncate text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {rx.doctorName}
            </p>
          </div>
        </div>

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
            <span
              className="flex items-center gap-1 text-[10px]"
              style={{ color: "var(--color-text-muted)" }}
            >
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

      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 250ms ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <RxClinicalDocument items={rx.items} layout="plain" />
        </div>
      </div>
    </div>
  );
}

export interface PrescriptionPublishedHistoryListProps {
  prescriptions: PatientPrescriptionSummary[];
}

/** Renders nothing when `prescriptions` is empty. */
export function PrescriptionPublishedHistoryList({ prescriptions }: PrescriptionPublishedHistoryListProps) {
  if (prescriptions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {prescriptions.map((rx) => (
        <PrescriptionHistoryAccordionItem key={rx.id} rx={rx} />
      ))}
    </div>
  );
}
