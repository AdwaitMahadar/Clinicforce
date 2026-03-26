/**
 * app/(app)/appointments/_lib/calendar-range.ts
 *
 * Single source of truth for computing the ISO date-range window given a
 * calendar view mode and an anchor date. Shared between:
 *   - appointments/dashboard/page.tsx  (server side — fetches appointments)
 *   - AppointmentCalendarClient.tsx    (client side — previously getRangeForView)
 *
 * Returning ISO strings from one place ensures both sides can never drift.
 */

import {
  startOfMonth, endOfMonth,
  startOfWeek,  endOfWeek,
  startOfDay,   endOfDay,
} from "date-fns";

export type CalendarView = "month" | "week" | "day";

/** Returns the ISO start/end boundaries for the given view and anchor date. */
export function getCalendarRange(
  view: string,
  date: Date,
): { rangeStart: string; rangeEnd: string } {
  if (view === "week") {
    return {
      rangeStart: startOfWeek(date).toISOString(),
      rangeEnd:   endOfWeek(date).toISOString(),
    };
  }
  if (view === "day") {
    return {
      rangeStart: startOfDay(date).toISOString(),
      rangeEnd:   endOfDay(date).toISOString(),
    };
  }
  // default: month
  return {
    rangeStart: startOfMonth(date).toISOString(),
    rangeEnd:   endOfMonth(date).toISOString(),
  };
}
