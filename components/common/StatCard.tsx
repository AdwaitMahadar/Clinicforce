import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  /** e.g. "+12%" or "-2%" */
  delta?: string;
  /** true = green badge, false = red badge */
  positive?: boolean;
  icon: LucideIcon;
}

export function StatCard({ label, value, delta, positive = true, icon: Icon }: StatCardProps) {
  return (
    <div
      className="p-5 rounded-xl transition-transform hover:-translate-y-0.5 cursor-default"
      style={{
        background: "var(--color-glass-fill-data)",
        border:     "var(--shadow-card-border)",
        boxShadow:  "var(--shadow-card)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </span>
        <Icon
          size={18}
          strokeWidth={1.5}
          style={{ color: "var(--color-text-muted)" }}
        />
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          {value}
        </span>

        {delta !== undefined && (
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              background: positive ? "var(--color-green-bg)" : "var(--color-red-bg)",
              color: positive ? "var(--color-green)" : "var(--color-red)",
            }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
