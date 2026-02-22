import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Extend this union when new statuses are added to the product. */
export type AppStatus =
  // ── Appointment statuses ─────────────────────────────────────
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed"
  | "no-show"
  | "rescheduled"
  // ── Patient statuses ─────────────────────────────────────────
  | "active"
  | "inactive"
  | "critical";

interface StatusStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
}

/**
 * Single source of truth for every status colour in the app.
 * Colours reference CSS vars — never hardcode hex here.
 */
const STATUS_MAP: Record<AppStatus, StatusStyle> = {
  // ── Appointment statuses ────────────────────────────────────────────────────
  confirmed:   { bg: "var(--color-green-bg)",  text: "var(--color-green)",  border: "var(--color-green-border)",  label: "Confirmed"   },
  pending:     { bg: "var(--color-amber-bg)",  text: "var(--color-amber)",  border: "var(--color-amber-border)",  label: "Pending"     },
  cancelled:   { bg: "var(--color-red-bg)",    text: "var(--color-red)",    border: "var(--color-red-border)",    label: "Cancelled"   },
  completed:   { bg: "var(--color-blue-bg)",   text: "var(--color-blue)",   border: "var(--color-blue-border)",   label: "Completed"   },
  "no-show":   { bg: "var(--color-purple-bg)", text: "var(--color-purple)", border: "var(--color-purple-border)", label: "No-show"     },
  rescheduled: { bg: "var(--color-amber-bg)",  text: "var(--color-amber)",  border: "var(--color-amber-border)",  label: "Rescheduled" },
  // ── Patient statuses ────────────────────────────────────────────────────────
  active:   { bg: "var(--color-green-bg)",  text: "var(--color-green)",  border: "var(--color-green-border)",  label: "Active"   },
  inactive: { bg: "var(--color-surface-alt)", text: "var(--color-text-secondary)", border: "var(--color-border)", label: "Inactive" },
  critical: { bg: "var(--color-red-bg)",    text: "var(--color-red)",    border: "var(--color-red-border)",    label: "Critical" },
};

interface StatusBadgeProps {
  status: AppStatus;
  className?: string;
}

/**
 * Thin wrapper over Shadcn `Badge` that maps a typed `AppStatus` to its
 * semantic colour. All colours live in STATUS_MAP → globals.css. One file
 * controls every status appearance across the whole app.
 *
 * @example <StatusBadge status="confirmed" />
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.pending;

  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap", className)}
      style={{
        background:   s.bg,
        color:        s.text,
        borderColor:  s.border,
      }}
    >
      {s.label}
    </Badge>
  );
}
