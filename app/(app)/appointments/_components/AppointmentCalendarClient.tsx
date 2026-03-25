"use client";

/**
 * app/(app)/appointments/_components/AppointmentCalendarClient.tsx
 *
 * Client-only calendar shell.
 * - view and date stored in URL via nuqs
 * - receives already-fetched appointment events as `initialEvents` prop
 * - Navigation updates the URL → Server Component re-renders with new
 *   rangeStart/rangeEnd → fresh events passed as props
 *
 * No server action calls happen here. No useEffect data fetching.
 * The only client state is dropdown-open booleans and the current date
 * used BEFORE the user navigates (so the calendar increments smoothly
 * via `useOptimistic` if needed). We keep it simple: just nuqs + props.
 */

import { useQueryStates, parseAsString } from "nuqs";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format, parseISO,
  addMonths, subMonths,
  addWeeks,  subWeeks,
  addDays,   subDays,
  startOfMonth, endOfMonth,
  startOfWeek,  endOfWeek,
  startOfDay, endOfDay,
  isToday,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthView }    from "@/components/common/MonthView";
import { TimeGridView } from "@/components/common/TimeGridView";
import type { AppointmentEvent } from "@/types/appointment";

export type CalendarView = "month" | "week" | "day";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHeaderLabel(view: CalendarView, date: Date): string {
  if (view === "month") return format(date, "MMMM yyyy");
  if (view === "week")  return format(date, "MMM d, yyyy");
  return format(date, "EEEE, MMM d, yyyy");
}

function navigateDate(view: CalendarView, date: Date, dir: -1 | 1): Date {
  if (view === "month") return dir === 1 ? addMonths(date, 1) : subMonths(date, 1);
  if (view === "week")  return dir === 1 ? addWeeks(date, 1)  : subWeeks(date, 1);
  return dir === 1 ? addDays(date, 1) : subDays(date, 1);
}

/** Compute the ISO date range for the given view + date. */
export function getRangeForView(view: CalendarView, date: Date) {
  if (view === "month") {
    return {
      rangeStart: startOfMonth(date).toISOString(),
      rangeEnd:   endOfMonth(date).toISOString(),
    };
  }
  if (view === "week") {
    return {
      rangeStart: startOfWeek(date).toISOString(),
      rangeEnd:   endOfWeek(date).toISOString(),
    };
  }
  return {
    rangeStart: startOfDay(date).toISOString(),
    rangeEnd:   endOfDay(date).toISOString(),
  };
}

// ─── View+Date control ────────────────────────────────────────────────────────

function ViewDateControl({
  current,
  onViewChange,
  currentDate,
  onNavigate,
  onToday,
}: {
  current:     CalendarView;
  onViewChange:(v: CalendarView) => void;
  currentDate: Date;
  onNavigate:  (dir: -1 | 1) => void;
  onToday:     () => void;
}) {
  const views: { key: CalendarView; label: string }[] = [
    { key: "month", label: "Month" },
    { key: "week",  label: "Week"  },
    { key: "day",   label: "Day"   },
  ];
  const isTodayVisible = current === "day" && isToday(currentDate);

  return (
    <motion.div
      layout
      className="flex items-center p-1 rounded-lg gap-0.5"
      style={{
        background: "var(--color-glass-fill-data)",
        border:     "var(--shadow-card-border)",
        boxShadow:  "var(--shadow-card)",
      }}
      transition={{ layout: { type: "spring", stiffness: 350, damping: 30, mass: 0.5 } }}
    >
      {views.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onViewChange(key)}
          className={`relative px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 cursor-pointer ${
            current === key 
              ? "" 
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
          style={current === key ? { color: "var(--color-ink-fg)" } : undefined}
        >
          {current === key && (
            <motion.span
              layoutId="view-pill"
              className="absolute inset-0 rounded-md"
              style={{ background: "var(--color-ink)", boxShadow: "var(--shadow-card)" }}
              transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.6 }}
            />
          )}
          <span className="relative z-10">{label}</span>
        </button>
      ))}

      <div className="self-stretch mx-1" style={{ width: "1px", background: "var(--color-border)" }} />

      <button
        onClick={() => onNavigate(-1)}
        className="size-7 flex items-center justify-center rounded-md transition-colors cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)]"
        title="Previous"
      >
        <ChevronLeft size={14} />
      </button>

      <button
        onClick={onToday}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
          isTodayVisible
            ? "text-[var(--color-text-muted)] cursor-default"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        }`}
      >
        <span className="hidden sm:inline">{getHeaderLabel(current, currentDate)}</span>
        <span className="sm:hidden">Today</span>
      </button>

      <button
        onClick={() => onNavigate(1)}
        className="size-7 flex items-center justify-center rounded-md transition-colors cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)]"
        title="Next"
      >
        <ChevronRight size={14} />
      </button>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  /** Already-fetched events from the Server Component parent. */
  initialEvents: AppointmentEvent[];
}

export function AppointmentCalendarClient({ initialEvents }: Props) {
  const router = useRouter();

  // URL state — changing these triggers a Next.js re-render of the parent
  // Server Component which fetches new events and passes them as props.
  const [params, setParams] = useQueryStates(
    {
      view: parseAsString.withDefault("month"),
      date: parseAsString.withDefault(new Date().toISOString().slice(0, 10)),
    },
    { shallow: false }
  );

  const view = params.view;
  const dateStr = params.date;
  const setDateStr = (d: string) => setParams({ date: d });

  const calView = (view === "week" || view === "day" ? view : "month") as CalendarView;

  const currentDate = useMemo(() => {
    try { return parseISO(dateStr); } catch { return new Date(); }
  }, [dateStr]);

  const subtitle = useMemo(() => {
    if (calView === "month") return `${format(currentDate, "MMMM yyyy")} — Monthly schedule overview`;
    if (calView === "week")  return `Week of ${format(currentDate, "MMM d, yyyy")}`;
    return `Detailed timeline for ${format(currentDate, "EEEE, MMMM d")}`;
  }, [calView, currentDate]);

  function handleViewChange(v: CalendarView) {
    if (v === "day") {
      // Native nuqs batching: submit both view and date in one URL transition to prevent flicker
      setParams({ view: v, date: new Date().toISOString().slice(0, 10) });
    } else {
      setParams({ view: v });
    }
  }

  function handleNavigate(dir: -1 | 1) {
    const next = navigateDate(calView, currentDate, dir);
    setDateStr(next.toISOString().slice(0, 10));
  }

  function handleToday() {
    setDateStr(new Date().toISOString().slice(0, 10));
  }

  function handleEventClick(appt: AppointmentEvent) {
    router.push(`/appointments/view/${appt.id}`);
  }

  function handleDateChange(d: Date) {
    setDateStr(d.toISOString().slice(0, 10));
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <ViewDateControl
        current={calView}
        onViewChange={handleViewChange}
        currentDate={currentDate}
        onNavigate={handleNavigate}
        onToday={handleToday}
      />
      <Button
        className="gap-2 shadow-sm"
        style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
        onClick={() => router.push("/appointments/new")}
      >
        <Plus size={15} />
        New Appt
      </Button>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-5 min-h-0">
      <PageHeader title="Appointments" subtitle={subtitle} actions={headerActions} />

      <div
        className="flex-1 min-h-0 rounded-xl overflow-hidden flex flex-col"
        style={{
          background: "var(--color-glass-fill-data)",
          border:     "var(--shadow-card-border)",
          boxShadow:  "var(--shadow-card)",
        }}
      >
        {calView === "month" && (
          <MonthView
            appointments={initialEvents}
            currentDate={currentDate}
            onEventClick={handleEventClick}
          />
        )}
        {(calView === "week" || calView === "day") && (
          <TimeGridView
            appointments={initialEvents}
            view={calView}
            currentDate={currentDate}
            onDateChange={handleDateChange}
            onEventClick={handleEventClick}
          />
        )}
      </div>
    </div>
  );
}
