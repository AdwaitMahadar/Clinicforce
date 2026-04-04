"use client";

/**
 * Keeps Date of Birth and Age in sync for patient forms.
 * - Editing DOB updates Age (via calendar age).
 * - When DOB is empty, entering Age sets DOB to January 1 of (current year − age).
 * Only `dateOfBirth` is persisted; `age` is a client-only form field.
 */

import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { differenceInYears, isValid, parseISO } from "date-fns";

function parseDobIso(dob: string | undefined): Date | null {
  const t = dob?.trim();
  if (!t) return null;
  try {
    const d = parseISO(t.length >= 10 ? t.slice(0, 10) : t);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

function ageStringFromDob(dob: string | undefined): string {
  const d = parseDobIso(dob);
  if (!d) return "";
  return String(differenceInYears(new Date(), d));
}

export function PatientDobAgeSync() {
  const { watch, setValue, getValues } = useFormContext<{
    dateOfBirth?: string;
    age?: string | number;
  }>();

  const dob = watch("dateOfBirth");
  const ageVal = watch("age");
  const source = useRef<"dob" | "age" | null>(null);

  // DOB changed → recompute age
  useEffect(() => {
    if (source.current === "age") {
      source.current = null;
      return;
    }
    const nextAge = ageStringFromDob(dob);
    const current = String(getValues("age") ?? "");
    if (nextAge !== current) {
      source.current = "dob";
      setValue("age", nextAge, { shouldValidate: false, shouldDirty: true });
    }
  }, [dob, getValues, setValue]);

  // Age changed while DOB empty → set Jan 1 birth date
  useEffect(() => {
    if (source.current === "dob") {
      source.current = null;
      return;
    }
    const dobStr = (getValues("dateOfBirth") as string | undefined)?.trim() ?? "";
    if (parseDobIso(dobStr) !== null) return;

    const raw = ageVal;
    const n =
      typeof raw === "string" ? parseInt(raw, 10) : typeof raw === "number" ? raw : NaN;
    if (raw === "" || raw === undefined || Number.isNaN(n) || n < 0) {
      return;
    }
    const birthYear = new Date().getFullYear() - n;
    const nextDob = `${birthYear}-01-01`;
    if (nextDob !== dobStr) {
      source.current = "age";
      setValue("dateOfBirth", nextDob, { shouldValidate: false, shouldDirty: true });
    }
  }, [ageVal, getValues, setValue]);

  return null;
}
