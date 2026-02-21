import { cn } from "@/lib/utils";

/** Shape of a single event in the log. */
export interface LogEvent {
  /** Short heading — what happened. */
  title: string;
  /** Supporting detail — who/what it affected. */
  body?: string;
  /** Human-readable timestamp, e.g. "12 min ago", "Yesterday". */
  time: string;
  /** Filled dot = unread/recent; hollow = historical. Default: false */
  unread?: boolean;
}

interface EventLogProps {
  events: LogEvent[];
  /** Optional header action rendered top-right (e.g. "Mark all read"). */
  action?: React.ReactNode;
  /** Max height before the list scrolls. Default: 380px */
  maxHeight?: number | string;
  className?: string;
}

/**
 * Generic chronological event log / history / timeline component.
 *
 * Accepts any array of `LogEvent` objects — appointment history, system
 * events, billing changes, audit trail — anything sequential.
 * All colours come from CSS vars in globals.css.
 *
 * @example
 * ```tsx
 * <EventLog
 *   events={[
 *     { title: "Lab results uploaded", body: "Hematology report", time: "12 min ago", unread: true },
 *   ]}
 * />
 * ```
 */
export function EventLog({ events, action, maxHeight = 380, className }: EventLogProps) {
  return (
    <div className={className}>
      {/* ── Optional action slot ────────────────────────────── */}
      {action && (
        <div className="flex items-center justify-end mb-3">
          {action}
        </div>
      )}

      {/* ── Log card ────────────────────────────────────────── */}
      <div
        className="rounded-xl p-5 overflow-y-auto"
        style={{
          maxHeight,
          background: "var(--color-glass-fill-data)",
          border:     "var(--shadow-card-border)",
          boxShadow:  "var(--shadow-card)",
        }}
      >
        {events.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>
            No activity yet.
          </p>
        ) : (
          <div className="space-y-6 relative pl-2">
            {/* Vertical timeline rule */}
            <div
              className="absolute top-2 bottom-5 left-[7px] w-[2px]"
              style={{ background: "var(--color-border)" }}
              aria-hidden
            />
            {events.map((event, i) => (
              <EventLogItem key={i} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: single timeline row ───────────────────────────────────────

function EventLogItem({ event }: { event: LogEvent }) {
  return (
    <div className="flex gap-4 relative">
      {/* Dot */}
      <div className="flex-shrink-0 mt-1.5 z-10">
        <div
          className="size-4 rounded-full ring-4 ring-white"
          style={{
            background: event.unread
              ? "var(--color-ink)"
              : "var(--color-border)",
          }}
        />
      </div>

      {/* Content */}
      <div className="min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
          {event.title}
        </p>
        {event.body && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            {event.body}
          </p>
        )}
        <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
          {event.time}
        </p>
      </div>
    </div>
  );
}
