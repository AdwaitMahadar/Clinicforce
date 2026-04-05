"use client";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventContentArg } from "@fullcalendar/core";
import type { AppointmentEvent } from "@/types/appointment";
import type { AppointmentCategory } from "@/lib/constants/appointment";
import { CATEGORY_COLORS } from "@/lib/appointment-calendar-styles";
import { formatAppointmentHeading } from "@/lib/utils/format-appointment-heading";
import { AppointmentEventCard } from "./AppointmentEventCard";

interface TimeGridViewProps {
  appointments: AppointmentEvent[];
  view: "week" | "day";
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick?: (appointment: AppointmentEvent) => void;
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
  // Calculate an offset so the current time sits naturally inside the view
  // rather than glued to the absolute top edge. FullCalendar accepts any HH:mm
  // string for scrollTime and safely handles container boundaries.
  const scrollTime = `${Math.max(0, new Date().getHours() - 2).toString().padStart(2, "0")}:00:00`;

  // Convert AppointmentEvent → FullCalendar EventInput array
  const events = appointments.map((a) => {
    const heading = formatAppointmentHeading({
      category:  a.category,
      visitType: a.visitType,
      title:     a.title,
    });
    return {
      id:    a.id,
      title: heading,
      start: a.start,
      end:   a.end,
      color:
        CATEGORY_COLORS[a.category as AppointmentCategory]?.solid ??
        "var(--color-blue)",
      extendedProps: {
        patientName: a.patientName,
        doctorName:  a.doctorName,
        category:    a.category,
        visitType:   a.visitType,
        title:       a.title,
        status:      a.status,
        heading,
      },
    };
  });

  function renderEventContent(info: EventContentArg) {
    return <AppointmentEventCard eventInfo={info} />;
  }

  return (
    <div className="h-full flex-1 fullcalendar-clinicforce">
      <FullCalendar
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
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        scrollTime={scrollTime}
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
