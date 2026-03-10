/**
 * app/(app)/patients/new/page.tsx
 *
 * Full-page fallback for creating a new patient.
 * Shown on direct URL access / hard refresh of /patients/new.
 * During normal in-app navigation the intercepting modal takes over.
 */

import { PatientDetailPanel } from "../_components/PatientDetailPanel";

export default function NewPatientPage() {
  return (
    <div className="p-8 h-full flex flex-col">
      <p
        className="text-xs font-medium mb-6"
        style={{ color: "var(--color-text-muted)" }}
      >
        Patients › New Patient
      </p>

      <div
        className="flex-1 rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-glass-fill-data)",
          border:     "1px solid var(--color-border)",
          boxShadow:  "var(--shadow-card)",
        }}
      >
        <PatientDetailPanel mode="create" />
      </div>
    </div>
  );
}
