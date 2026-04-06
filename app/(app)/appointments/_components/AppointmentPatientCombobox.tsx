"use client";

import { useCallback, type Ref } from "react";
import { toast } from "sonner";
import { AsyncSearchCombobox } from "@/components/common/AsyncSearchCombobox";
import { searchPatientsForPicker } from "@/lib/actions/patients";
import { formatPatientChartId } from "@/lib/utils/chart-id";
import type { PatientPickerHit } from "@/types/patient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RhfFieldLike = {
  value: unknown;
  onChange: (v: string) => void;
  onBlur: () => void;
  name: string;
  ref: Ref<HTMLButtonElement>;
};

export interface AppointmentPatientComboboxProps {
  field: RhfFieldLike;
  disabled?: boolean;
  /** Required when `disabled` — e.g. edit mode patient row label. */
  disabledDisplayLabel?: string;
}

export function AppointmentPatientCombobox({
  field,
  disabled,
  disabledDisplayLabel,
}: AppointmentPatientComboboxProps) {
  const fetchItems = useCallback(async (query: string) => {
    const res = await searchPatientsForPicker({ query });
    if (!res.success) {
      toast.error(res.error ?? "Failed to search patients.");
      return [];
    }
    return res.data ?? [];
  }, []);

  const value = String(field.value ?? "");

  return (
    <AsyncSearchCombobox<PatientPickerHit>
      id={field.name}
      triggerRef={field.ref}
      value={value}
      onValueChange={(next) => field.onChange(next)}
      onBlur={field.onBlur}
      disabled={disabled}
      disabledDisplayLabel={disabledDisplayLabel}
      placeholder="Search patients by name, chart ID, email, or phone…"
      searchPlaceholder="Type to search…"
      emptyLabel="No patients match."
      fetchItems={fetchItems}
      getOptionValue={(p) => p.id}
      getOptionLabel={(p) =>
        `${p.firstName} ${p.lastName} (${formatPatientChartId(p.chartId)})`
      }
      renderOption={(p) => (
        <span className="truncate">
          <span style={{ color: "var(--color-text-primary)" }}>
            {p.firstName} {p.lastName}
          </span>
          <span className="ml-1.5 text-muted-foreground text-xs">
            {formatPatientChartId(p.chartId)}
          </span>
        </span>
      )}
    />
  );
}
