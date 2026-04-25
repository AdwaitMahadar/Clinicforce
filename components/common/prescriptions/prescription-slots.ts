import { Moon, Sun, Sunrise } from "lucide-react";

export type PrescriptionSlotKey = "morning" | "afternoon" | "night";

/** Dose slot config for draft editors and read-only ℞ document dose pills. */
export const PRESCRIPTION_DOSE_SLOTS = [
  {
    key: "morning" as const,
    enabled: "morningEnabled" as const,
    qty: "morningQuantity" as const,
    timing: "morningTiming" as const,
    label: "Morning",
    Icon: Sunrise,
    color: {
      active: "var(--color-amber-bg)",
      border: "var(--color-amber-border)",
      text: "var(--color-amber)",
      iconColor: "var(--color-amber)",
    },
  },
  {
    key: "afternoon" as const,
    enabled: "afternoonEnabled" as const,
    qty: "afternoonQuantity" as const,
    timing: "afternoonTiming" as const,
    label: "Afternoon",
    Icon: Sun,
    color: {
      active: "var(--color-blue-bg)",
      border: "var(--color-blue-border)",
      text: "var(--color-blue)",
      iconColor: "var(--color-blue)",
    },
  },
  {
    key: "night" as const,
    enabled: "nightEnabled" as const,
    qty: "nightQuantity" as const,
    timing: "nightTiming" as const,
    label: "Night",
    Icon: Moon,
    color: {
      active: "var(--color-purple-bg)",
      border: "var(--color-purple-border)",
      text: "var(--color-purple)",
      iconColor: "var(--color-purple)",
    },
  },
] as const;

export type PrescriptionDoseSlot = (typeof PRESCRIPTION_DOSE_SLOTS)[number];
