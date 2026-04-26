"use client";

/**
 * Sidebar-only patient snapshot on appointment detail (admin/doctor).
 * Data comes from `AppointmentDetail.patientSummary` (`getAppointmentDetailCore` + `buildAppointmentDetailCore`).
 * Any missing / empty optional value renders as "—".
 */

import { Mars, UserRound, Venus } from "lucide-react";
import { InitialsBadge } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import type { AppointmentDetailPatientSummary } from "@/types/appointment";
import type { PatientGender } from "@/types/patient";
import { cn } from "@/lib/utils";

function dash(s: string | null | undefined): string {
  const t = s?.trim();
  return t && t.length > 0 ? t : "—";
}

function GenderIcon({ gender }: { gender: PatientGender }) {
  if (gender === "Male") {
    return <Mars className="size-3 shrink-0" aria-hidden />;
  }
  if (gender === "Female") {
    return <Venus className="size-3 shrink-0" aria-hidden />;
  }
  return <UserRound className="size-3 shrink-0" aria-hidden />;
}

/** Accent for gender pill: icon, label, and outline — background stays `surface-alt`. */
function genderBadgeAccent(
  gender: PatientGender | null
): { color: string; borderColor: string } | undefined {
  if (gender === "Male") {
    return { color: "var(--color-blue)", borderColor: "var(--color-blue-border-emphasis)" };
  }
  if (gender === "Female") {
    return { color: "var(--color-purple)", borderColor: "var(--color-purple-border)" };
  }
  if (gender === "Other" || gender === "Prefer not to say") {
    return { color: "var(--color-amber)", borderColor: "var(--color-amber-border)" };
  }
  return undefined;
}

const labelCls =
  "text-[10px] font-bold uppercase tracking-widest shrink-0 mb-1";

export function AppointmentPatientSummaryCard({
  summary,
}: {
  summary: AppointmentDetailPatientSummary;
}) {
  const name = dash(summary.fullName);
  const ageLabel =
    summary.ageYears != null && Number.isFinite(summary.ageYears)
      ? `${summary.ageYears} yrs`
      : "—";
  const gender = summary.gender;
  const genderLabel = gender ?? "—";
  const allergies = dash(summary.allergies);
  const history = dash(summary.pastHistoryNotes);

  const badgeClass =
    "rounded-full border px-2 py-0.5 text-[10px] font-semibold gap-1 leading-none";
  const genderAccent = genderBadgeAccent(gender);

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="scrollbar-hover flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-3">
        <div className="flex min-w-0 items-stretch gap-3">
          <div className="flex shrink-0 self-stretch min-h-0 flex-col">
            <div className="h-full min-h-8 w-auto shrink-0 aspect-square">
              <InitialsBadge
                name={summary.fullName.trim() || name}
                size="md"
                className="size-full min-h-0 rounded-lg"
                fallbackClassName="text-lg"
              />
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <p
              className="text-md font-bold leading-snug tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {name}
            </p>
            <div className="mt-1.5 flex flex-row flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn(badgeClass, "pointer-events-none shrink-0")}
                style={{
                  background: "var(--color-surface-alt)",
                  color: "var(--color-text-secondary)",
                  borderColor: "var(--color-border)",
                }}
              >
                {ageLabel}
              </Badge>
              <Badge
                variant="outline"
                className={cn(badgeClass, "pointer-events-none shrink-0")}
                style={{
                  background: "var(--color-surface-alt)",
                  ...(genderAccent ?? {
                    color: "var(--color-text-secondary)",
                    borderColor: "var(--color-border)",
                  }),
                }}
              >
                {gender ? (
                  <>
                    <GenderIcon gender={gender} />
                    <span>{genderLabel}</span>
                  </>
                ) : (
                  genderLabel
                )}
              </Badge>
            </div>
          </div>
        </div>

        <div
          className="my-3 shrink-0 border-t"
          style={{ borderColor: "var(--color-border)" }}
          aria-hidden
        />

        <div className="min-w-0 space-y-4">
          <div>
            <p className={labelCls} style={{ color: "var(--color-text-muted)" }}>
              Allergies
            </p>
            <p
              className="text-xs font-medium leading-relaxed"
              style={{ color: "var(--color-text-primary)" }}
            >
              {allergies}
            </p>
          </div>
          <div>
            <p className={labelCls} style={{ color: "var(--color-text-muted)" }}>
              Past history
            </p>
            <p
              className="text-xs font-medium leading-relaxed"
              style={{ color: "var(--color-text-primary)" }}
            >
              {history}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
