import { notFound } from "next/navigation";
import { getAppointmentDetail, getActiveDoctors } from "@/lib/actions/appointments";
import { mapDoctorPickerResults } from "@/app/(app)/appointments/_lib/appointment-picker-options";
import { buildAppointmentDetail } from "@/app/(app)/appointments/_lib/appointment-detail-mapper";
import { AppointmentViewModalClient } from "./AppointmentViewModalClient";

export async function AppointmentViewModalContent({ id }: { id: string }) {
  const [result, doctorsRes] = await Promise.all([
    getAppointmentDetail(id),
    getActiveDoctors(),
  ]);
  const { doctorOptions } = mapDoctorPickerResults(doctorsRes);

  if (!result.success) notFound();

  return (
    <AppointmentViewModalClient
      appointment={buildAppointmentDetail(result.data)}
      doctorOptions={doctorOptions}
    />
  );
}
