"use client";

/**
 * components/common/PanelCloseButton.tsx
 *
 * Standardised close button for detail panels (PatientDetailPanel,
 * MedicineDetailPanel, AppointmentDetailPanel).
 *
 * Uses Lucide X with CSS :hover via Tailwind CSS-variable classes instead
 * of imperative onMouseEnter/onMouseLeave DOM mutations.
 *
 * Always requires an explicit `onClose` handler from the parent — panels
 * decide whether to call router.back() or a custom callback.
 */

import { X } from "lucide-react";

interface PanelCloseButtonProps {
  onClose: () => void;
}

export function PanelCloseButton({ onClose }: PanelCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="size-8 rounded-lg flex items-center justify-center transition-colors focus:outline-none text-(--color-text-muted) hover:bg-(--color-border) hover:text-(--color-text-primary)"
    >
      <X size={14} />
    </button>
  );
}
