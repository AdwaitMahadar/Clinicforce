"use client";

/**
 * Keeps Date of Birth and Age in sync for patient forms.
 * - Changing DOB updates Age immediately (calendar age).
 * - Changing Age updates approximate DOB (Jan 1 of current year − age) after **300ms**
 *   debounce from the last age change; programmatic age updates from DOB skip one debounced
 *   cycle so a precise DOB is not replaced by Jan 1. Submit still runs
 *   `flushApproximateDobFromAgeIfAgeDirty` when the age field is dirty (no wait for debounce).
 * Only `dateOfBirth` is persisted; `age` is a client-only form field.
 */

import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import type { FieldValues, Path, UseFormGetValues, UseFormSetValue, UseFormReturn } from "react-hook-form";
import { differenceInYears, isValid, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";

const AGE_TO_DOB_DEBOUNCE_MS = 300;
const AGE_MIN = 0;
const AGE_MAX = 130;

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

/** Parsed integer age from the form, or `null` if missing / invalid / out of range. */
function parseAgeFieldValue<T extends FieldValues>(
  getValues: UseFormGetValues<T>
): number | null {
  const raw = getValues("age" as Path<T>) as unknown;
  const n =
    typeof raw === "number" && Number.isFinite(raw)
      ? Math.trunc(raw)
      : parseInt(String(raw ?? "").trim(), 10);
  if (raw === "" || raw === undefined || Number.isNaN(n) || n < AGE_MIN || n > AGE_MAX) {
    return null;
  }
  return n;
}

/**
 * Writes approximate DOB (Jan 1) from the current Age field value.
 * No-op when age is missing, non-numeric, out of range, or DOB already matches.
 */
function applyApproximateDobFromAge<T extends FieldValues>(
  getValues: UseFormGetValues<T>,
  setValue: UseFormSetValue<T>
): void {
  const n = parseAgeFieldValue(getValues);
  if (n === null) return;
  const birthYear = new Date().getFullYear() - n;
  const nextDob = `${birthYear}-01-01`;
  const current = String(getValues("dateOfBirth" as Path<T>) ?? "").trim();
  if (current === nextDob) return;
  setValue("dateOfBirth" as Path<T>, nextDob as never, {
    shouldValidate: false,
    shouldDirty: true,
  });
}

/** True when current DOB already yields the same calendar age as the age field (no Jan-1 write needed). */
function isAgeAlreadyConsistentWithDob<T extends FieldValues>(
  getValues: UseFormGetValues<T>
): boolean {
  const n = parseAgeFieldValue(getValues);
  if (n === null) return false;
  const d = parseDobIso(getValues("dateOfBirth" as Path<T>) as string | undefined);
  if (!d) return false;
  return differenceInYears(new Date(), d) === n;
}

/**
 * Before submit: flush age → Jan 1 DOB when the user edited the age field and values
 * are not already calendar-consistent (avoids clobbering DOB-only edits).
 */
export function flushApproximateDobFromAgeIfAgeDirty<T extends FieldValues>(
  methods: UseFormReturn<T>
): void {
  const dirty = methods.formState.dirtyFields as { age?: boolean };
  if (!dirty.age) return;
  if (isAgeAlreadyConsistentWithDob(methods.getValues)) return;
  applyApproximateDobFromAge(methods.getValues, methods.setValue);
}

/** DOB → age sync + debounced age → approximate DOB (inside the same `<Form>` as `DetailForm`). */
export function PatientDobAgeSync() {
  const { watch, setValue, getValues } = useFormContext<{
    dateOfBirth?: string;
    age?: string | number;
  }>();

  const dob = watch("dateOfBirth");
  const ageVal = watch("age");
  /** When true, the next debounced age→DOB run is skipped (age was just set from DOB). */
  const skipDebouncedAgeToDobRef = useRef(false);

  useEffect(() => {
    const d = parseDobIso(dob);
    if (!d) {
      const cur = getValues("age");
      if (cur !== undefined && cur !== "") {
        skipDebouncedAgeToDobRef.current = true;
        setValue("age", undefined, { shouldValidate: false, shouldDirty: false });
      }
      return;
    }
    const nextAge = differenceInYears(new Date(), d);
    const current = getValues("age");
    const curNum =
      typeof current === "number" && Number.isFinite(current)
        ? Math.trunc(current)
        : parseInt(String(current ?? "").trim(), 10);
    if (!Number.isNaN(curNum) && curNum === nextAge) return;
    skipDebouncedAgeToDobRef.current = true;
    setValue("age", nextAge, { shouldValidate: false, shouldDirty: false });
  }, [dob, getValues, setValue]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (skipDebouncedAgeToDobRef.current) {
        skipDebouncedAgeToDobRef.current = false;
        return;
      }
      if (isAgeAlreadyConsistentWithDob(getValues)) return;
      applyApproximateDobFromAge(getValues, setValue);
    }, AGE_TO_DOB_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [ageVal, getValues, setValue]);

  return null;
}

type PatientAgeFormControlProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: any;
  disabled?: boolean;
  placeholder?: string;
};

/** Age `<Input />` — approximate DOB is synced via debounced `PatientDobAgeSync`. */
export function PatientAgeFormControl({
  field,
  disabled,
  placeholder = "Years",
}: PatientAgeFormControlProps) {
  return (
    <Input
      type="number"
      placeholder={placeholder}
      min={0}
      max={130}
      step={1}
      disabled={disabled}
      {...field}
      value={field.value === undefined || field.value === null ? "" : String(field.value)}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") {
          field.onChange(undefined);
          return;
        }
        const n = Number(v);
        field.onChange(Number.isFinite(n) ? n : undefined);
      }}
    />
  );
}
