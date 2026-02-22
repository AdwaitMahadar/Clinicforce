"use client";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventContentArg } from "@fullcalendar/core";
import { useRef } from "react";
import type { MockAppointment } from "@/mock/appointments/dashboard";
import { TYPE_COLORS } from "@/mock/appointments/dashboard";
import { AppointmentEventCard } from "./AppointmentEventCard";

interface TimeGridViewProps {
  appointments: MockAppointment[];
  view: "week" | "day";
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick?: (appointment: MockAppointment) => void;
}

/**
 * FullCalendar time-grid wrapper for both Week and Day views.
 * The parent controls navigation via currentDate; we drive the calendar
 * through the API ref when currentDate changes.
 */
export function TimeGridView({
  appointments,
  view,
  currentDate,
  onDateChange,
  onEventClick,
}: TimeGridViewProps) {
  const calendarRef = useRef<FullCalendar>(null);

  // Convert MockAppointments → FullCalendar EventInput array
  const events = appointments.map((a) => ({
    id:    a.id,
    title: a.patientName,
    start: a.start,
    end:   a.end,
    color: TYPE_COLORS[a.type]?.solid ?? "#2563EB",
    extendedProps: {
      patientName: a.patientName,
      doctorName:  a.doctorName,
      type:        a.type,
      status:      a.status,
    },
  }));

  function renderEventContent(info: EventContentArg) {
    return <AppointmentEventCard eventInfo={info} />;
  }

  return (
    <div className="h-full flex-1 fullcalendar-clinicforce">
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView={view === "week" ? "timeGridWeek" : "timeGridDay"}
        key={`${view}-${currentDate.toISOString().slice(0, 10)}`}
        initialDate={currentDate}
        events={events}
        eventContent={renderEventContent}
        headerToolbar={false}
        datesSet={(info) => onDateChange(info.view.currentStart)}
        eventClick={(info) => {
          const appt = appointments.find((a) => a.id === info.event.id);
          if (appt) onEventClick?.(appt);
        }}
        height="100%"
        slotMinTime="07:00:00"
        slotMaxTime="20:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        allDaySlot={false}
        nowIndicator
        expandRows
        stickyHeaderDates
        dayHeaderFormat={
          view === "week"
            ? { weekday: "short", day: "numeric" }
            : { weekday: "long", month: "long", day: "numeric" }
        }
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        eventBorderColor="transparent"
        eventBackgroundColor="transparent"
      />
    </div>
  );
}
