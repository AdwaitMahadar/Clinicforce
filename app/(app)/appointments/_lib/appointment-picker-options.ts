/**
 * Maps `getActivePatients` / `getActiveDoctors` action results to DetailForm select options.
 * `getActivePatients` from `@/lib/actions/patients`; `getActiveDoctors` from `@/lib/actions/appointments`.
 * Used by server entry points; keeps mapping logic in one place.
 */

import { getActiveDoctors } from "@/lib/actions/appointments";
import { getActivePatients } from "@/lib/actions/patients";
import { formatPatientChartId } from "@/lib/utils/chart-id";
import type { AppointmentSelectOption } from "@/types/appointment";

type PatientsResult = Awaited<ReturnType<typeof getActivePatients>>;
type DoctorsResult = Awaited<ReturnType<typeof getActiveDoctors>>;

export function mapAppointmentPickerResults(
  patientsRes: PatientsResult,
  doctorsRes: DoctorsResult
): {
  patientOptions: AppointmentSelectOption[];
  doctorOptions: AppointmentSelectOption[];
} {
  const patientOptions =
    patientsRes.success && patientsRes.data
      ? patientsRes.data.map((p) => ({
          label: `${p.firstName} ${p.lastName} (${formatPatientChartId(p.chartId)})`,
          value: p.id,
        }))
      : [];
  const doctorOptions =
    doctorsRes.success && doctorsRes.data
      ? doctorsRes.data.map((d) => ({
          label: [d.firstName, d.lastName].filter(Boolean).join(" ") || d.name,
          value: d.id,
        }))
      : [];
  return { patientOptions, doctorOptions };
}

/** Fetches and maps picker options (for create flows and any server page that only needs selects). */
export async function loadAppointmentFormSelectOptions() {
  const [patientsRes, doctorsRes] = await Promise.all([
    getActivePatients(),
    getActiveDoctors(),
  ]);
  return mapAppointmentPickerResults(patientsRes, doctorsRes);
}
