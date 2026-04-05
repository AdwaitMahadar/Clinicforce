import { Clock, User } from "lucide-react";
import type { EventContentArg } from "@fullcalendar/core";
import {
  APPOINTMENT_VISIT_TYPE_LABELS,
  type AppointmentCategory,
  type AppointmentVisitType,
} from "@/lib/constants/appointment";
import { CATEGORY_COLORS } from "@/lib/appointment-calendar-styles";
import { cn } from "@/lib/utils";

interface AppointmentEventCardProps {
  eventInfo: EventContentArg;
}

/**
 * Custom FullCalendar event renderer for the week & day time-grid views.
 *
 * Expects `event.extendedProps` to contain:
 *   - patientName, doctorName, category, visitType, title, status, heading (optional preformatted)
 */
export function AppointmentEventCard({ eventInfo }: AppointmentEventCardProps) {
  const { event } = eventInfo;
  const category = (event.extendedProps.category ?? "general") as AppointmentCategory;
  const visitType = (event.extendedProps.visitType ?? "general") as AppointmentVisitType;
  const colors =
    CATEGORY_COLORS[category] ?? CATEGORY_COLORS.general;
  const label =
    APPOINTMENT_VISIT_TYPE_LABELS[visitType] ?? visitType;

  const timeText   = eventInfo.timeText;
  const doctorName = event.extendedProps.doctorName as string;
  const displayTitle =
    (event.extendedProps.heading as string | undefined) ?? event.title;

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
        {/* Heading + visit-type badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[11px] font-bold truncate leading-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            {displayTitle}
          </span>
          {!isCompact && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 border"
              style={{
                background: colors.bg,
                color:      colors.text,
                borderColor: colors.border,
              }}
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
