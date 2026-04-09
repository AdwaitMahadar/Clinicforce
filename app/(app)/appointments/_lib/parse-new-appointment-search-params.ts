/**
 * Builds `AppointmentCreateInitialValues` from `/appointments/new` URL search params
 * (patients directory “schedule” action, bookmarks, etc.). Unknown enum values are dropped.
 */

import {
  APPOINTMENT_CATEGORIES,
  APPOINTMENT_VISIT_TYPES,
} from "@/lib/constants/appointment";
import type {
  AppointmentCategory,
  AppointmentVisitType,
} from "@/lib/constants/appointment";
import { idSchema } from "@/lib/validators/common";
import type { AppointmentCreateInitialValues } from "@/types/appointment";

function firstString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === "string" ? v : v[0];
}

export function parseNewAppointmentSearchParams(
  sp: Record<string, string | string[] | undefined>
): AppointmentCreateInitialValues | undefined {
  const patientIdRaw = firstString(sp.patientId);
  const patientLabel = firstString(sp.patientLabel);
  const doctorId = firstString(sp.doctorId);
  const categoryRaw = firstString(sp.category);
  const visitTypeRaw = firstString(sp.visitType);

  const out: AppointmentCreateInitialValues = {};

  if (patientIdRaw && idSchema.safeParse(patientIdRaw).success) {
    out.patientId = patientIdRaw;
  }
  if (patientLabel !== undefined && patientLabel.length > 0) {
    out.patientDisplayLabel = patientLabel;
  }
  if (doctorId !== undefined && doctorId.length > 0) {
    out.doctorId = doctorId;
  }
  if (
    categoryRaw &&
    (APPOINTMENT_CATEGORIES as readonly string[]).includes(categoryRaw)
  ) {
    out.category = categoryRaw as AppointmentCategory;
  }
  if (
    visitTypeRaw &&
    (APPOINTMENT_VISIT_TYPES as readonly string[]).includes(visitTypeRaw)
  ) {
    out.visitType = visitTypeRaw as AppointmentVisitType;
  }

  if (Object.keys(out).length === 0) return undefined;
  return out;
}
