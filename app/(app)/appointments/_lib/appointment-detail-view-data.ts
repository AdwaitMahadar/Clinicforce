import { getAppointmentDetailCore, getActiveDoctors } from "@/lib/actions/appointments";
import { mapDoctorPickerResults } from "./appointment-picker-options";
import { buildAppointmentDetailCore } from "./appointment-detail-mapper";

export async function loadAppointmentDetailViewData(id: string) {
  const [result, doctorsRes] = await Promise.all([
    getAppointmentDetailCore(id),
    getActiveDoctors(),
  ]);
  if (!result.success) return null;
  const appointment = buildAppointmentDetailCore(result.data);
  const { doctorOptions } = mapDoctorPickerResults(doctorsRes);
  return { appointment, doctorOptions };
}
