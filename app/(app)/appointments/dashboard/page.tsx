"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import type { MockAppointment } from "@/mock/appointments/dashboard";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthView } from "@/components/common/MonthView";
import { TimeGridView } from "@/components/common/TimeGridView";
import { MOCK_APPOINTMENTS } from "@/mock/appointments/dashboard";

type CalendarView = "month" | "week" | "day";

// ─── Helper: human-readable date label for the header ─────────────────────────
function getHeaderLabel(view: CalendarView, date: Date): string {
  if (view === "month") return format(date, "MMMM yyyy");
  if (view === "week") {
    // Show the first day of the week's month/year
    return format(date, "MMM d, yyyy");
  }
  // Day view
  return format(date, "EEEE, MMM d, yyyy");
}

// ─── Helper: navigate forward/backward ────────────────────────────────────────
function navigateDate(view: CalendarView, date: Date, direction: -1 | 1): Date {
  if (view === "month") return direction === 1 ? addMonths(date, 1) : subMonths(date, 1);
  if (view === "week")  return direction === 1 ? addWeeks(date, 1)  : subWeeks(date, 1);
  return direction === 1 ? addDays(date, 1) : subDays(date, 1);
}

// ─── Fused view + date control ────────────────────────────────────────────────
function ViewDateControl({
  current,
  onViewChange,
  currentDate,
  onNavigate,
  onToday,
}: {
  current: CalendarView;
  onViewChange: (v: CalendarView) => void;
  currentDate: Date;
  onNavigate: (direction: -1 | 1) => void;
  onToday: () => void;
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
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30, mass: 0.5 },
      }}
    >
      {/* View tabs */}
      {views.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onViewChange(key)}
          className="relative px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150"
          style={{
            color: current === key
              ? "var(--color-ink-fg)"
              : "var(--color-text-secondary)",
          }}
        >
          {/* Sliding active pill — animates between tabs on click */}
          {current === key && (
            <motion.span
              layoutId="view-pill"
              className="absolute inset-0 rounded-md"
              style={{
                background: "var(--color-ink)",
                boxShadow:  "var(--shadow-card)",
              }}
              transition={{
                type:      "spring",
                stiffness: 500,
                damping:   35,
                mass:      0.6,
              }}
            />
          )}
          <span className="relative z-10">{label}</span>
        </button>
      ))}

      {/* Divider */}
      <div
        className="self-stretch mx-1"
        style={{ width: "1px", background: "var(--color-border)" }}
      />

      {/* Date navigator */}
      <button
        onClick={() => onNavigate(-1)}
        className="size-7 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--color-surface-alt)]"
        style={{ color: "var(--color-text-secondary)" }}
        title="Previous"
      >
        <ChevronLeft size={14} />
      </button>

      <button
        onClick={onToday}
        className="px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap"
        style={
          isTodayVisible
            ? { color: "var(--color-text-muted)", cursor: "default" }
            : { color: "var(--color-text-primary)" }
        }
      >
        <span className="hidden sm:inline">{getHeaderLabel(current, currentDate)}</span>
        <span className="sm:hidden">Today</span>
      </button>

      <button
        onClick={() => onNavigate(1)}
        className="size-7 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--color-surface-alt)]"
        style={{ color: "var(--color-text-secondary)" }}
        title="Next"
      >
        <ChevronRight size={14} />
      </button>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AppointmentsDashboardPage() {
  const router = useRouter();
  const [view,        setView]        = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  function handleEventClick(appt: MockAppointment) {
    router.push(`/appointments/${appt.id}`);
  }

  // Subtitle changes by view
  const subtitle = useMemo(() => {
    if (view === "month") return `${format(currentDate, "MMMM yyyy")} — Monthly schedule overview`;
    if (view === "week")  return `Week of ${format(currentDate, "MMM d, yyyy")}`;
    return `Detailed timeline for ${format(currentDate, "EEEE, MMMM d")}`;
  }, [view, currentDate]);

  function handleNavigate(direction: -1 | 1) {
    setCurrentDate((d) => navigateDate(view, d, direction));
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  function handleViewChange(v: CalendarView) {
    setView(v);
    // When switching to day view from month, jump to today if in a different month
    // Otherwise keep the current date context
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Fused view + date control */}
      <ViewDateControl
        current={view}
        onViewChange={handleViewChange}
        currentDate={currentDate}
        onNavigate={handleNavigate}
        onToday={handleToday}
      />

      {/* New Appointment */}
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
    <div className="p-8 h-full flex flex-col gap-5 min-h-0">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <PageHeader
        title="Appointments"
        subtitle={subtitle}
        actions={headerActions}
      />

      {/* ── Calendar card ────────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 rounded-xl overflow-hidden flex flex-col"
        style={{
          background: "var(--color-glass-fill-data)",
          border:     "var(--shadow-card-border)",
          boxShadow:  "var(--shadow-card)",
        }}
      >
        {view === "month" && (
          <MonthView
            appointments={MOCK_APPOINTMENTS}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onEventClick={handleEventClick}
          />
        )}

        {(view === "week" || view === "day") && (
          <TimeGridView
            appointments={MOCK_APPOINTMENTS}
            view={view}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onEventClick={handleEventClick}
          />
        )}
      </div>
    </div>
  );
}
