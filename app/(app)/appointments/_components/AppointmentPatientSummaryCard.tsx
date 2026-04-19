"use client";

/**
 * Sidebar-only patient snapshot on appointment detail (admin/doctor).
 * Data comes from `AppointmentDetail.patientSummary` (getAppointmentDetail + mapper).
 * Any missing / empty optional value renders as "—".
 */

import type { AppointmentDetailPatientSummary } from "@/types/appointment";

function dash(s: string | null | undefined): string {
  const t = s?.trim();
  return t && t.length > 0 ? t : "—";
}

export function AppointmentPatientSummaryCard({
  summary,
}: {
  summary: AppointmentDetailPatientSummary;
}) {
  const name = dash(summary.fullName);
  const age =
    summary.ageYears != null && Number.isFinite(summary.ageYears)
      ? `${summary.ageYears} yrs`
      : "—";
  const gender = summary.gender != null ? summary.gender : "—";
  const blood = dash(summary.bloodGroup);
  const allergies = dash(summary.allergies);
  const history = dash(summary.pastHistoryNotes);

  const labelCls =
    "text-[10px] font-bold uppercase tracking-widest shrink-0";
  const valueCls = "text-xs font-medium text-right min-w-0";

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-2"
        style={{ color: "var(--color-text-muted)" }}
      >
        Patient
      </p>
      <p
        className="text-sm font-bold leading-snug mb-3"
        style={{ color: "var(--color-text-primary)" }}
      >
        {name}
      </p>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className={labelCls} style={{ color: "var(--color-text-muted)" }}>
            Age
          </span>
          <span className={valueCls} style={{ color: "var(--color-text-primary)" }}>
            {age}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className={labelCls} style={{ color: "var(--color-text-muted)" }}>
            Gender
          </span>
          <span className={valueCls} style={{ color: "var(--color-text-primary)" }}>
            {gender}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className={labelCls} style={{ color: "var(--color-text-muted)" }}>
            Blood group
          </span>
          <span className={valueCls} style={{ color: "var(--color-text-primary)" }}>
            {blood}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className={labelCls} style={{ color: "var(--color-text-muted)" }}>
            Allergies
          </span>
          <span className={valueCls} style={{ color: "var(--color-text-primary)" }}>
            {allergies}
          </span>
        </div>
        <div
          className="space-y-1 pt-2 border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className={labelCls} style={{ color: "var(--color-text-muted)" }}>
            Past history
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--color-text-primary)" }}
          >
            {history}
          </p>
        </div>
      </div>
    </div>
  );
}
