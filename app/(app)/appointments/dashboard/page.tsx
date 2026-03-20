/**
 * app/(app)/appointments/dashboard/page.tsx
 *
 * Pure async Server Component. Reads `view` and `date` URL params
 * (managed by AppointmentCalendarClient via nuqs), computes the rangeStart
 * and rangeEnd, calls getAppointments, and passes events as props to the
 * client calendar component.
 *
 * No "use client", no useState, no useEffect, no data fetching in client.
 */

import {
  parseISO,
  startOfMonth, endOfMonth,
  startOfWeek,  endOfWeek,
  isValid,
} from "date-fns";
import { getAppointments } from "@/lib/actions/appointments";
import { VALID_APPOINTMENT_DISPLAY_TYPES } from "@/lib/appointment-calendar-styles";
import { AppointmentCalendarClient } from "../_components/AppointmentCalendarClient";
import type { AppointmentEvent } from "@/types/appointment";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getRange(view: string, date: Date) {
  if (view === "week") {
    return { rangeStart: startOfWeek(date), rangeEnd: endOfWeek(date) };
  }
  if (view === "day") {
    return { rangeStart: date, rangeEnd: date };
  }
  // default: month
  return { rangeStart: startOfMonth(date), rangeEnd: endOfMonth(date) };
}

export default async function AppointmentsDashboardPage({ searchParams }: PageProps) {
  const sp   = await searchParams;
  const view = typeof sp.view === "string" ? sp.view : "month";
  const dateStr = typeof sp.date === "string" ? sp.date : new Date().toISOString().slice(0, 10);

  let currentDate = new Date();
  try {
    const parsed = parseISO(dateStr);
    if (isValid(parsed)) currentDate = parsed;
  } catch { /* use today */ }

  const { rangeStart, rangeEnd } = getRange(view, currentDate);

  const result = await getAppointments({
    rangeStart: rangeStart.toISOString(),
    rangeEnd:   rangeEnd.toISOString(),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: AppointmentEvent[] = result.success
    ? (result.data as any[]).map((a: any): AppointmentEvent => {
        const start = a.date ? new Date(a.date) : new Date();
        const durationMs = Number(a.duration ?? 30) * 60 * 1000;
        const end = new Date(start.getTime() + durationMs);
        const apptType = (VALID_APPOINTMENT_DISPLAY_TYPES.has(a.type) ? a.type : "general") as AppointmentEvent["type"];
        return {
          id:          a.id,
          patientName: a.patientName ?? "",
          doctorName:  a.doctorName  ?? "",
          type:        apptType,
          status:      a.status as AppointmentEvent["status"],
          start:       start.toISOString(),
          end:         end.toISOString(),
          notes:       a.notes ?? "",
        };
      })
    : [];

  return <AppointmentCalendarClient initialEvents={events} />;
}
