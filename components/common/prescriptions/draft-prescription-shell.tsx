"use client";

import type { ReactNode } from "react";
import { Pill } from "lucide-react";
import type { PrescriptionForAppointmentTab } from "@/types/prescription";
import { formatPrescriptionChartId } from "@/lib/utils/chart-id";
import { Button } from "@/components/ui/button";

export interface DraftPrescriptionShellProps {
  rx: PrescriptionForAppointmentTab;
  onClearClick: () => void;
  onPublishClick: () => void;
  /** Middle region: empty hint, DnD list, add picker, “Add another” button. */
  children: ReactNode;
  /** Notes footer (label + textarea + optional clear). */
  notesFooter: ReactNode;
}

/**
 * Outer draft prescription card: header (Rx# + Clear / Publish) + body slot + notes footer.
 * Uses the same border weight as nested line-item cards (`--color-border`).
 */
export function DraftPrescriptionShell({
  rx,
  onClearClick,
  onPublishClick,
  children,
  notesFooter,
}: DraftPrescriptionShellProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-shadow"
      style={{
        background: "var(--color-glass-fill-data)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b"
        style={{ borderColor: "var(--color-glass-border)", background: "var(--color-surface-alt)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Pill className="size-4 shrink-0" style={{ color: "var(--color-text-muted)" }} aria-hidden />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-bold uppercase tracking-widest shrink-0"
                style={{ color: "var(--color-text-muted)" }}
              >
                Prescription
              </span>
              <span className="text-xs font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                {formatPrescriptionChartId(rx.chartId)}
              </span>
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Draft · auto-saved
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs"
            style={{ color: "var(--color-text-secondary)" }}
            onClick={onClearClick}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-3 text-xs font-semibold"
            disabled={rx.items.length === 0}
            onClick={onPublishClick}
            style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
          >
            Publish Rx
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 py-3">{children}</div>

      <div
        className="border-t px-4 py-3"
        style={{ borderColor: "var(--color-glass-border)", background: "var(--color-surface-alt)" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {notesFooter}
      </div>
    </div>
  );
}
