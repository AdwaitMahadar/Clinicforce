import { notFound } from "next/navigation";
import { getAppointmentDetail, getActiveDoctors } from "@/lib/actions/appointments";
import { getActivePatients } from "@/lib/actions/patients";
import { mapAppointmentPickerResults } from "@/app/(app)/appointments/_lib/appointment-picker-options";
import { buildAppointmentDetail } from "@/app/(app)/appointments/_lib/appointment-detail-mapper";
import { AppointmentDetailPanel } from "@/app/(app)/appointments/_components/AppointmentDetailPanel";

export async function AppointmentViewModalContent({ id }: { id: string }) {
  const [result, patientsRes, doctorsRes] = await Promise.all([
    getAppointmentDetail(id),
    getActivePatients(),
    getActiveDoctors(),
  ]);
  const { patientOptions, doctorOptions } = mapAppointmentPickerResults(patientsRes, doctorsRes);

  if (!result.success) notFound();

  return (
    <AppointmentDetailPanel
      mode="edit"
      appointment={buildAppointmentDetail(result.data)}
      patientOptions={patientOptions}
      doctorOptions={doctorOptions}
    />
  );
}
