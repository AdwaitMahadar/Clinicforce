"use client";

/**
 * Patient detail "Prescriptions" tab — accordion list of published prescriptions.
 * Each row expands inline to show a clinical ℞ document. No navigation to appointment.
 */

import { Pill } from "lucide-react";
import type { PatientPrescriptionSummary } from "@/types/patient";
import { PrescriptionPublishedHistoryList } from "@/components/common/prescriptions/prescription-published-history-list";

export interface PatientPrescriptionsTabProps {
  patientId: string;
  initialPrescriptions: PatientPrescriptionSummary[];
}

export function PatientPrescriptionsTab({ patientId, initialPrescriptions }: PatientPrescriptionsTabProps) {
  if (initialPrescriptions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-xl py-14 px-6 text-center"
        data-patient-id={patientId}
        style={{
          background: "var(--color-glass-fill-data)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid var(--color-glass-border)",
        }}
      >
        <div
          className="flex size-11 items-center justify-center rounded-full"
          style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border)" }}
        >
          <Pill className="size-5" style={{ color: "var(--color-text-muted)" }} aria-hidden />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            No published prescriptions
          </p>
          <p className="text-xs max-w-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            Published prescriptions from this patient's visits will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-patient-id={patientId}>
      <PrescriptionPublishedHistoryList prescriptions={initialPrescriptions} />
    </div>
  );
}
