/**
 * app/(app)/patients/new/page.tsx
 *
 * Full-page fallback for creating a new patient.
 * Shown on direct URL access / hard refresh of /patients/new.
 * During normal in-app navigation the intercepting modal takes over.
 */

import { DetailPageShell } from "@/components/layout/DetailPageShell";
import { PatientDetailPanel } from "../_components/PatientDetailPanel";

export default function NewPatientPage() {
  return (
    <DetailPageShell breadcrumb="Patients › New Patient">
      <PatientDetailPanel mode="create" />
    </DetailPageShell>
  );
}
