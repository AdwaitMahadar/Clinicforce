/**
 * Maps `getActiveDoctors` action results to DetailForm select options.
 * Patient picker uses debounced `searchPatientsForPicker` on the client — no bulk preload.
 */

import { getActiveDoctors } from "@/lib/actions/appointments";
import type { AppointmentSelectOption } from "@/types/appointment";

type DoctorsResult = Awaited<ReturnType<typeof getActiveDoctors>>;

export function mapDoctorPickerResults(doctorsRes: DoctorsResult): {
  doctorOptions: AppointmentSelectOption[];
} {
  const doctorOptions =
    doctorsRes.success && doctorsRes.data
      ? doctorsRes.data.map((d) => ({
          label: [d.firstName, d.lastName].filter(Boolean).join(" ") || d.name,
          value: d.id,
        }))
      : [];
  return { doctorOptions };
}

/** Fetches doctor options for appointment create/edit (server entry points). */
export async function loadAppointmentDoctorOptions() {
  const doctorsRes = await getActiveDoctors();
  return mapDoctorPickerResults(doctorsRes);
}
