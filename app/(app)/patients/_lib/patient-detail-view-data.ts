import { getPatientDetailCore } from "@/lib/actions/patients";
import { buildPatientDetailCore } from "./patient-detail-mapper";

export async function loadPatientDetailViewData(id: string) {
  const result = await getPatientDetailCore(id);
  if (!result.success) return null;
  return { patient: buildPatientDetailCore(result.data) };
}
