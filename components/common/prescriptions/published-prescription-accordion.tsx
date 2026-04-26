"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle2, ChevronDown } from "lucide-react";
import type { PrescriptionForAppointmentTab } from "@/types/prescription";
import { formatPrescriptionChartId } from "@/lib/utils/chart-id";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RxClinicalDocument } from "@/components/common/prescriptions/rx-clinical-document";

/** Single published Rx for the current appointment — collapsible read-only ℞. */
export function PublishedPrescriptionAccordion({
  rx,
  highlightCurrent = false,
}: {
  rx: PrescriptionForAppointmentTab;
  /** When true (appointment tab, this visit): blue border + inline **Current** `Badge` (same tokens as `AppointmentListTab`). */
  highlightCurrent?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const borderColor = highlightCurrent ? "var(--color-blue-border)" : "var(--color-green-border)";

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        background: "var(--color-glass-fill-data)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: `1px solid ${borderColor}`,
      }}
    >
      <button
        type="button"
        className={cn(
          "w-full grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left transition-colors",
          highlightCurrent
            ? "hover:bg-[color:var(--color-blue-bg)]/25"
            : "hover:bg-[color:var(--color-green-bg)]/30"
        )}
        aria-expanded={open}
        aria-current={highlightCurrent ? "page" : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--color-green)" }} aria-hidden />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>
                {formatPrescriptionChartId(rx.chartId)}
              </span>
              {highlightCurrent ? (
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
              ) : null}
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  background: "var(--color-green-bg)",
                  color: "var(--color-green)",
                  border: "1px solid var(--color-green-border)",
                }}
              >
                Published
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              {rx.items.length} {rx.items.length === 1 ? "medicine" : "medicines"}
            </span>
            {rx.publishedAt ? (
              <span className="text-[10px]" style={{ color: "var(--color-green)" }}>
                {format(parseISO(rx.publishedAt), "MMM d, yyyy · h:mm a")}
              </span>
            ) : null}
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
          <RxClinicalDocument items={rx.items} notes={rx.notes} layout="accordionPanel" />
        </div>
      </div>
    </div>
  );
}
