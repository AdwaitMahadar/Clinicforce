"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Pill } from "lucide-react";
import type { PrescriptionForAppointmentTab } from "@/types/prescription";
import { formatPrescriptionChartId } from "@/lib/utils/chart-id";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface DraftPrescriptionShellProps {
  rx: PrescriptionForAppointmentTab;
  onClearClick: () => void;
  onPublishClick: () => void;
  /** Middle region: empty hint, DnD list, add picker, “Add another” button. */
  children: ReactNode;
  /** Notes footer (label + textarea + optional clear). */
  notesFooter: ReactNode;
  /**
   * When true, body + notes collapse behind the header (same `grid-template-rows` animation
   * as `PublishedPrescriptionAccordion`). Clear / Publish stay outside the toggle.
   */
  collapsible?: boolean;
  /** Initial expanded state when `collapsible` — default `true` (draft editing stays discoverable). */
  defaultOpen?: boolean;
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
  collapsible = false,
  defaultOpen = true,
}: DraftPrescriptionShellProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [rx.id, defaultOpen]);

  const titleCluster = (
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
  );

  const actions = (
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
  );

  const bodyAndNotes = (
    <>
      <div className="flex flex-col gap-3 px-4 py-3">{children}</div>
      <div
        className="border-t px-4 py-3"
        style={{ borderColor: "var(--color-glass-border)", background: "var(--color-surface-alt)" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {notesFooter}
      </div>
    </>
  );

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
        {collapsible ? (
          <button
            type="button"
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-lg py-0.5 text-left outline-none",
              "focus-visible:ring-2 focus-visible:ring-[color:var(--color-border)] focus-visible:ring-offset-2"
            )}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronDown
              className="size-4 shrink-0 transition-transform duration-200"
              style={{
                color: "var(--color-text-muted)",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
              }}
              aria-hidden
            />
            {titleCluster}
          </button>
        ) : (
          titleCluster
        )}
        {actions}
      </div>

      {collapsible ? (
        <div
          style={{
            display: "grid",
            gridTemplateRows: open ? "1fr" : "0fr",
            transition: "grid-template-rows 250ms ease",
          }}
        >
          <div className="min-h-0 overflow-hidden">{bodyAndNotes}</div>
        </div>
      ) : (
        bodyAndNotes
      )}
    </div>
  );
}
