import { Clock, User } from "lucide-react";
import type { EventContentArg } from "@fullcalendar/core";
import type { AppointmentType } from "@/mock/appointments/dashboard";
import { TYPE_COLORS, TYPE_LABELS } from "@/mock/appointments/dashboard";
import { cn } from "@/lib/utils";

interface AppointmentEventCardProps {
  eventInfo: EventContentArg;
}

/**
 * Custom FullCalendar event renderer for the week & day time-grid views.
 *
 * Expects `event.extendedProps` to contain:
 *   - patientName: string
 *   - doctorName:  string
 *   - type:        AppointmentType
 *   - status:      AppointmentStatus
 */
export function AppointmentEventCard({ eventInfo }: AppointmentEventCardProps) {
  const { event } = eventInfo;
  const type      = (event.extendedProps.type ?? "general") as AppointmentType;
  const colors    = TYPE_COLORS[type] ?? TYPE_COLORS.general;
  const label     = TYPE_LABELS[type] ?? type;

  const timeText   = eventInfo.timeText;
  const doctorName = event.extendedProps.doctorName as string;

  // Determine if the event block is "small" (< 45min) — shrink content
  const durationMs = event.end
    ? event.end.getTime() - event.start!.getTime()
    : 3_600_000;
  const isCompact = durationMs < 45 * 60 * 1000;

  return (
    <div
      className={cn(
        "h-full w-full rounded-md overflow-hidden flex border-l-[3px] cursor-pointer group/event",
        "transition-shadow hover:shadow-md"
      )}
      style={{
        background:  colors.bg,
        borderColor: colors.solid,
        borderTop:   "1px solid",
        borderRight: "1px solid",
        borderBottom:"1px solid",
        borderTopColor:    colors.border,
        borderRightColor:  colors.border,
        borderBottomColor: colors.border,
      }}
    >
      <div className="flex flex-col justify-center px-2 py-1.5 min-w-0 flex-1">
        {/* Patient name + type badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[11px] font-bold truncate leading-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            {event.title}
          </span>
          {!isCompact && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
              style={{ background: colors.solid + "22", color: colors.solid }}
            >
              {label}
            </span>
          )}
        </div>

        {/* Time + Doctor — only when not ultra-compact */}
        {!isCompact && (
          <div
            className="flex items-center gap-2 mt-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            <span className="flex items-center gap-0.5 text-[9px]">
              <Clock size={9} />
              {timeText}
            </span>
            {doctorName && (
              <span className="flex items-center gap-0.5 text-[9px] truncate">
                <User size={9} />
                {doctorName}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
