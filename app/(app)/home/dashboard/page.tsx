/**
 * app/(app)/home/dashboard/page.tsx
 *
 * Pure async Server Component. Fetches real stats, recent appointments,
 * and renders the full page UI directly — no client shell, no useState,
 * no useEffect. Column definitions with cell functions live here (in the
 * same module scope), not passed as serialised props across a boundary.
 */

import { CalendarDays, Users, ClipboardList, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  StatCard,
  EventLog,
} from "@/components/common";
import { HomeRecentTables } from "../_components/HomeRecentTables";
import type { HomeRecentAppointmentRow } from "@/types/home";
import { getHomeStats, getRecentAppointments } from "@/lib/actions/home";


// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomeDashboardPage() {
  const [statsResult, apptsResult] = await Promise.all([
    getHomeStats(),
    getRecentAppointments(5),
  ]);

  const stats = statsResult.success ? statsResult.data : null;

  const statCards = [
    { label: "Total Patients",     value: stats?.totalPatients?.toLocaleString() ?? "—", delta: "", positive: true,  icon: Users        },
    { label: "Appointments Today", value: String(stats?.appointmentsToday        ?? "—"), delta: "", positive: true,  icon: CalendarDays  },
    { label: "Scheduled",          value: String(stats?.appointmentsScheduled     ?? "—"), delta: "", positive: false, icon: ClipboardList },
    { label: "New This Month",     value: String(stats?.newPatientsThisMonth      ?? "—"), delta: "", positive: true,  icon: TrendingUp    },
  ];

  const appointmentRows: HomeRecentAppointmentRow[] = apptsResult.success
    ? apptsResult.data.map((a) => ({
        id:          a.id,
        time:        a.scheduledAt
          ? format(new Date(a.scheduledAt as unknown as string), "hh:mm a")
          : "—",
        patientName: a.patientName,
        visitType:   a.type.replace(/-/g, " "),
        status:      a.status,
      }))
    : [];

  return (
    <div className="p-8 h-full">
      <div className="max-w-[1700px] mx-auto w-full">

        <PageHeader
          title="Dashboard"
          subtitle="Welcome back, here's your clinic overview for today."
          actions={
            <Link href="/appointments/new">
              <Button
                style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
                className="gap-2 shadow-sm"
              >
                + New Appt
              </Button>
            </Link>
          }
        />

        {/* Stat cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </section>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                Today&apos;s Schedule
              </h2>
              <Link href="/appointments/dashboard">
                <button className="text-sm font-medium hover:underline" style={{ color: "var(--color-text-secondary)" }}>
                  View Calendar
                </button>
              </Link>
            </div>
            <HomeRecentTables data={appointmentRows} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                Recent Activity
              </h2>
            </div>
            {/* TODO: Implement when audit_log table is built. */}
            <EventLog events={[]} />
          </section>

        </div>
      </div>
    </div>
  );
}
