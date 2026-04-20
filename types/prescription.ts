/**
 * Prescription view models shared by server actions, RSC mappers, and client tab UI.
 * `PrescriptionWithItemsPayload` uses `Date` (DB / in-process). `PrescriptionForAppointmentTab`
 * is JSON-safe for `AppointmentDetail` → `PrescriptionsTab` props.
 */

export type PrescriptionItemPayload = {
  id: string;
  medicineId: string;
  medicineName: string | null;
  displayMedicineName: string;
  morningEnabled: boolean;
  morningQuantity: number;
  morningTiming: string;
  afternoonEnabled: boolean;
  afternoonQuantity: number;
  afternoonTiming: string;
  nightEnabled: boolean;
  nightQuantity: number;
  nightTiming: string;
  duration: string | null;
  remarks: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PrescriptionWithItemsPayload = {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  chartId: number;
  notes: string | null;
  publishedAt: Date | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  items: PrescriptionItemPayload[];
};

export type PrescriptionItemForAppointmentTab = Omit<
  PrescriptionItemPayload,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

export type PrescriptionForAppointmentTab = Omit<
  PrescriptionWithItemsPayload,
  "publishedAt" | "createdAt" | "updatedAt" | "items"
> & {
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: PrescriptionItemForAppointmentTab[];
};

function iso(d: Date | string): string {
  return typeof d === "string" ? d : d.toISOString();
}

/** Normalizes server action / DB `Date` values or JSON `string` timestamps into tab props. */
export function toAppointmentTabPrescription(
  p: PrescriptionWithItemsPayload
): PrescriptionForAppointmentTab {
  return {
    id: p.id,
    appointmentId: p.appointmentId,
    patientId: p.patientId,
    doctorId: p.doctorId,
    chartId: p.chartId,
    notes: p.notes,
    publishedAt: p.publishedAt == null ? null : iso(p.publishedAt),
    isActive: p.isActive,
    createdBy: p.createdBy,
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
    items: [...p.items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({
        id: i.id,
        medicineId: i.medicineId,
        medicineName: i.medicineName,
        displayMedicineName: i.displayMedicineName,
        morningEnabled: i.morningEnabled,
        morningQuantity: i.morningQuantity,
        morningTiming: i.morningTiming,
        afternoonEnabled: i.afternoonEnabled,
        afternoonQuantity: i.afternoonQuantity,
        afternoonTiming: i.afternoonTiming,
        nightEnabled: i.nightEnabled,
        nightQuantity: i.nightQuantity,
        nightTiming: i.nightTiming,
        duration: i.duration,
        remarks: i.remarks,
        sortOrder: i.sortOrder,
        createdAt: iso(i.createdAt),
        updatedAt: iso(i.updatedAt),
      })),
  };
}
