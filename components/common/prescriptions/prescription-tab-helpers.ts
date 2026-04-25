import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import type {
  PrescriptionForAppointmentTab,
  PrescriptionWithItemsPayload,
} from "@/types/prescription";
import { toAppointmentTabPrescription } from "@/types/prescription";

export type MedicinePickerRow = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  form: string | null;
  lastPrescribedDate: Date | string | null;
};

export function applyPayload(
  setRx: Dispatch<SetStateAction<PrescriptionForAppointmentTab | null>>,
  data: PrescriptionWithItemsPayload | undefined
) {
  if (!data) return;
  setRx(toAppointmentTabPrescription(data));
}

export async function failToast<T extends { success: boolean; error?: string }>(res: T): Promise<boolean> {
  if (!res.success) {
    toast.error(res.error ?? "Something went wrong.");
    return false;
  }
  return true;
}

export function medicineSubtitle(m: MedicinePickerRow): string {
  return [m.category, m.form].filter(Boolean).join(" · ");
}
