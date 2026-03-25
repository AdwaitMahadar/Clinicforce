"use client";

/**
 * components/common/ModalShell.tsx
 *
 * Universal modal shell used for intercepting modal routes (and any other
 * programmatic modal overlays in the app).
 *
 * Provides:
 *   - Blurred, semi-transparent backdrop
 *   - Centred panel with configurable size
 *   - Entry animation (fade + subtle zoom)
 *   - Escape key dismissal
 *   - Backdrop click dismissal
 *   - ARIA dialog semantics
 *
 * All behaviour flags are opt-out: they default ON and the caller can
 * disable them when needed (e.g. a confirmation inside the modal manages
 * its own Escape handling).
 *
 * ─── Size presets ──────────────────────────────────────────────────────────
 *
 *   sm   →  min(92vw, 540px)  × min(85vh, 480px)   — confirm dialogs, pickers
 *   md   →  min(92vw, 760px)  × min(85vh, 600px)   — simple forms
 *   lg   →  min(92vw, 1100px) × min(88vh, 820px)   — richer forms
 *   xl   →  min(92vw, 1650px) × min(90vh, 1080px)  — full detail panels  ← default
 *   full →  96vw              × 96vh               — immersive / full-canvas
 *
 * `width` / `height` props override the preset entirely when you need a
 * non-standard size (e.g. "min(92vw, 900px)").
 *
 * ─── Usage ────────────────────────────────────────────────────────────────
 *
 * Basic (intercept route — onClose defaults to router.back()):
 * ```tsx
 * import { ModalShell } from "@/components/common/ModalShell";
 *
 * export default function InterceptedMedicineModal() {
 *   return (
 *     <ModalShell label="Edit Medicine" size="xl">
 *       <MedicineDetailPanel mode="edit" medicine={medicine} />
 *     </ModalShell>
 *   );
 * }
 * ```
 *
 * Custom close handler (e.g. controlled modal triggered by a button):
 * ```tsx
 * <ModalShell
 *   label="Confirm Delete"
 *   size="sm"
 *   onClose={() => setOpen(false)}
 *   closeOnEscape={false}       // handled internally by the confirm dialog
 * >
 *   <ConfirmDialog onConfirm={handleDelete} onCancel={() => setOpen(false)} />
 * </ModalShell>
 * ```
 */

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import {
  MODAL_SHELL_SIZE_MAP,
  type ModalSize,
} from "@/components/common/modal-shell-sizes";

export type { ModalSize };

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ModalShellProps {
  /** Content rendered inside the modal panel */
  children: React.ReactNode;

  /**
   * ARIA label for the dialog — used by screen readers.
   * Should describe the purpose, e.g. "Edit Appointment", "New Medicine".
   */
  label?: string;

  /**
   * Size preset. Controls max-width and max-height of the panel.
   * @default "xl"
   */
  size?: ModalSize;

  /**
   * Override the panel width entirely (e.g. "min(92vw, 900px)").
   * Takes precedence over `size` when provided.
   */
  width?: string;

  /**
   * Override the panel height entirely (e.g. "min(85vh, 700px)").
   * Takes precedence over `size` when provided.
   */
  height?: string;

  /**
   * Called when the modal requests to close (Escape key, backdrop click).
   *
   * If omitted, defaults to `router.back()` — the correct behaviour for
   * Next.js intercepting modal routes where closing should restore the
   * previous URL.
   */
  onClose?: () => void;

  /**
   * Whether pressing Escape dismisses the modal.
   * @default true
   */
  closeOnEscape?: boolean;

  /**
   * Whether clicking the backdrop dismisses the modal.
   * @default true
   */
  closeOnBackdropClick?: boolean;

  /**
   * Extra CSS class names applied to the panel element.
   * Useful for overriding border-radius, overflow, etc. on a per-call basis.
   */
  panelClassName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ModalShell({
  children,
  label,
  size = "xl",
  width,
  height,
  onClose,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  panelClassName = "",
}: ModalShellProps) {
  const router = useRouter();

  // Resolve the close handler — default to router.back() for intercept routes
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [onClose, router]);

  // Escape key
  useEffect(() => {
    if (!closeOnEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeOnEscape, handleClose]);

  // Resolved dimensions
  const resolvedSize = MODAL_SHELL_SIZE_MAP[size];
  const resolvedWidth  = width  ?? resolvedSize.width;
  const resolvedHeight = height ?? resolvedSize.height;

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background:           "rgba(26, 26, 24, 0.35)",
          backdropFilter:        "blur(3px)",
          WebkitBackdropFilter:  "blur(3px)",
        }}
        onClick={closeOnBackdropClick ? handleClose : undefined}
        aria-hidden="true"
      />

      {/* ── Modal panel ──────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-8"
        aria-modal="true"
        role="dialog"
        aria-label={label}
      >
        <div
          className={[
            "pointer-events-auto rounded-2xl overflow-hidden flex flex-col",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            panelClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            width:      resolvedWidth,
            height:     resolvedHeight,
            background: "var(--color-surface)",
            border:     "1px solid var(--color-border)",
            boxShadow:  "0 24px 64px -12px rgba(0,0,0,0.18), 0 8px 24px -4px rgba(0,0,0,0.08)",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
