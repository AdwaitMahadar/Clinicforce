"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  format,
  isToday,
} from "date-fns";
import { cn } from "@/lib/utils";

import type { MockAppointment, AppointmentType } from "@/mock/appointments/dashboard";
import { TYPE_COLORS } from "@/mock/appointments/dashboard";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_EVENTS_VISIBLE = 3;

interface MonthViewProps {
  appointments: MockAppointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDayClick?: (date: Date) => void;
  onEventClick?: (appointment: MockAppointment) => void;
}

export function MonthView({
  appointments,
  currentDate,
  onDateChange,
  onDayClick,
  onEventClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const calStart   = startOfWeek(monthStart);
  const calEnd     = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Group appointments by date string for fast lookup
  const apptsByDate: Record<string, MockAppointment[]> = {};
  for (const appt of appointments) {
    const dateKey = appt.start.slice(0, 10); // "YYYY-MM-DD"
    if (!apptsByDate[dateKey]) apptsByDate[dateKey] = [];
    apptsByDate[dateKey].push(appt);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Day-of-week header row ────────────────────────────────────────── */}
      <div
        className="grid grid-cols-7 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-border)", background: "var(--color-row-header)" }}
      >
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            {d}
          </div>
        ))}
      </div>


      {/* ── Calendar grid ────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-7 min-h-0 overflow-hidden" style={{ gridAutoRows: "1fr" }}>
        {days.map((day) => {
          const dateKey  = format(day, "yyyy-MM-dd");
          const dayAppts = apptsByDate[dateKey] ?? [];
          const overflow = dayAppts.length - MAX_EVENTS_VISIBLE;
          const isCurrentMonth = isSameMonth(day, currentDate);
          const todayFlag = isToday(day);

          return (
            <div
              key={dateKey}
              onClick={() => onDayClick?.(day)}
              className={cn(
                "border-r border-b group cursor-pointer overflow-hidden",
                "flex flex-col transition-colors hover:bg-[var(--color-surface-alt)]",
                !isCurrentMonth && "opacity-40"
              )}
              style={{ borderColor: "var(--color-border)" }}
            >
              {/* Day number */}
              <div className="px-2 pt-2 pb-1 flex-shrink-0">
                <span
                  className={cn(
                    "text-xs font-semibold inline-flex size-6 items-center justify-center rounded-full",
                    todayFlag
                      ? "bg-[var(--color-ink)] text-[var(--color-ink-fg)]"
                      : "text-[var(--color-text-secondary)]"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Event chips */}
              <div className="flex-1 overflow-hidden px-1 pb-1 space-y-0.5">
                {dayAppts.slice(0, MAX_EVENTS_VISIBLE).map((appt) => {
                  const colors = TYPE_COLORS[appt.type as AppointmentType] ?? TYPE_COLORS.general;
                  const time   = appt.start.slice(11, 16); // "HH:MM"
                  return (
                    <button
                      key={appt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(appt);
                      }}
                      className="w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate block leading-tight border transition-opacity hover:opacity-80"
                      style={{
                        background:  colors.bg,
                        color:       colors.text,
                        borderColor: colors.border,
                      }}
                    >
                      {time} · {appt.patientName.split(" ")[0]}
                    </button>
                  );
                })}
                {overflow > 0 && (
                  <span
                    className="text-[9px] font-medium px-1.5 block"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    +{overflow} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
