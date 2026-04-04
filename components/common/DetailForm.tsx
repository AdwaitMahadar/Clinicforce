"use client";

/**
 * components/common/DetailForm.tsx
 *
 * A generic field-driven form panel, wired to React Hook Form + Zod v4.
 * Designed for entity detail modals (Medicine, Patient, Appointment, etc.)
 *
 * ─── Layout ───────────────────────────────────────────────────────────────────
 *
 * Pass `fields`: a single scrollable 2-column grid (col-span via `colSpan` on each
 * descriptor). Entity side columns (e.g. documents) are composed by the parent
 * next to this component (e.g. via `DetailPanel`).
 *
 * ─── Imperative API ────────────────────────────────────────────────────────────
 *
 * `forwardRef` + `DetailFormHandle`: `submit()` runs validation and `onSubmit`;
 * `reset()` resets to `defaultValues`. Footer actions live in the parent.
 *
 * ─── Field types ──────────────────────────────────────────────────────────────
 *
 *   "text" | "date" | "email" | "number" | "time"  → <Input type={…} />
 *   "textarea"                                      → <Textarea />
 *   "select"                                        → Radix <Select /> (controlled: `value` + `key` so external resets sync)
 *   "custom"  (requires renderControl)              → caller-supplied JSX
 *
 * Rules:
 * - All colours come from CSS variables — no hardcoded hex values
 * - Zod schemas live in lib/validators/ — passed as props, not inlined
 * - Toasts are owned by the parent `onSubmit` — not this component
 */

import React, { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import {
  useForm,
  type FieldValues,
  type DefaultValues,
  type Path,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { $ZodType } from "zod/v4/core";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

// ─── Field descriptor types ───────────────────────────────────────────────────

export interface SelectOption {
  label: string;
  value: string;
}

interface BaseField<TValues extends FieldValues> {
  /** Must match a key in the form's Zod schema */
  name: Path<TValues>;
  label: string;
  placeholder?: string;
  /** Span 1 or 2 columns in the grid. Default: 1 */
  colSpan?: 1 | 2;
  disabled?: boolean;
}

export interface TextField<TValues extends FieldValues> extends BaseField<TValues> {
  type: "text" | "date" | "email" | "number" | "time";
}

export interface TextareaField<TValues extends FieldValues> extends BaseField<TValues> {
  type: "textarea";
  rows?: number;
}

export interface SelectField<TValues extends FieldValues> extends BaseField<TValues> {
  type: "select";
  options: SelectOption[];
}

/**
 * CustomField — for fields that can't be expressed by the built-in types
 * (e.g. an avatar + text combo, a rich editor, a date-time picker).
 * Supply a `renderControl` function that receives the RHF field object
 * and returns JSX. FormLabel and FormMessage are still rendered automatically.
 */
export interface CustomField<TValues extends FieldValues> extends BaseField<TValues> {
  type: "custom";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderControl: (field: any) => React.ReactNode;
}

export type FormFieldDescriptor<TValues extends FieldValues> =
  | TextField<TValues>
  | TextareaField<TValues>
  | SelectField<TValues>
  | CustomField<TValues>;

// ─── Imperative handle ────────────────────────────────────────────────────────

export interface DetailFormHandle {
  /** Validates with Zod, then calls `onSubmit`. Rejects if validation fails or `onSubmit` throws. */
  submit: () => Promise<void>;
  /** Resets fields to the current `defaultValues` prop. */
  reset: () => void;
}

// ─── Main component props ─────────────────────────────────────────────────────

export interface DetailFormProps<TValues extends FieldValues> {
  /** The Zod schema for the form — import from lib/validators/ */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: $ZodType<TValues, any>;
  /** Initial field values — usually the record fetched from the DB */
  defaultValues: DefaultValues<TValues>;

  /** Field descriptors — single scrollable 2-column grid */
  fields: FormFieldDescriptor<TValues>[];

  /** Called with validated values on submit (native submit or `ref.submit()`). */
  onSubmit: (values: TValues) => Promise<void>;
  className?: string;
  /**
   * Rendered inside the same `<Form>` provider as the field grid (e.g. `useFormContext`
   * effects for cross-field sync). Not wrapped in a FormField row.
   */
  insideForm?: React.ReactNode;
}

// ─── Field control renderer ───────────────────────────────────────────────────

function renderFieldControl<TValues extends FieldValues>(
  descriptor: FormFieldDescriptor<TValues>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: any,
  isSaving: boolean
): React.ReactNode {
  if (descriptor.type === "custom") {
    return descriptor.renderControl(field);
  }

  if (descriptor.type === "textarea") {
    return (
      <Textarea
        rows={(descriptor as TextareaField<TValues>).rows ?? 5}
        placeholder={descriptor.placeholder}
        disabled={descriptor.disabled ?? isSaving}
        className="resize-none"
        {...field}
        value={String(field.value ?? "")}
      />
    );
  }

  if (descriptor.type === "select") {
    const selectValue = String(field.value ?? "");
    return (
      <Select
        key={selectValue}
        disabled={descriptor.disabled ?? isSaving}
        onValueChange={field.onChange}
        value={selectValue}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={
              descriptor.placeholder ??
              `Select ${descriptor.label.toLowerCase()}`
            }
          />
        </SelectTrigger>
        <SelectContent>
          {(descriptor as SelectField<TValues>).options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // text | date | email | number | time
  return (
    <Input
      type={descriptor.type}
      placeholder={descriptor.placeholder}
      disabled={descriptor.disabled ?? isSaving}
      {...field}
      value={String(field.value ?? "")}
    />
  );
}

// ─── Field grid ───────────────────────────────────────────────────────────────

function FieldGrid<TValues extends FieldValues>({
  fields,
  control,
  isSaving,
  gap = "gap-5",
}: {
  fields: FormFieldDescriptor<TValues>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  isSaving: boolean;
  gap?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 auto-rows-auto", gap)}>
      {fields.map((descriptor) => (
        <div
          key={String(descriptor.name)}
          className={descriptor.colSpan === 2 ? "col-span-2" : "col-span-1"}
        >
          <FormField
            control={control}
            name={descriptor.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{descriptor.label}</FormLabel>
                <FormControl>
                  {renderFieldControl(descriptor, field, isSaving)}
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Inner (generic) implementation ───────────────────────────────────────────

function DetailFormInner<TValues extends FieldValues>(
  {
    schema,
    defaultValues,
    fields,
    onSubmit,
    className,
    insideForm,
  }: DetailFormProps<TValues>,
  ref: React.ForwardedRef<DetailFormHandle>
) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<TValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues,
  });

  const runValidatedSubmit = useCallback(
    async (values: TValues) => {
      setIsSaving(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSaving(false);
      }
    },
    [onSubmit]
  );

  const handleFormSubmit = form.handleSubmit(runValidatedSubmit);

  useImperativeHandle(
    ref,
    () => ({
      submit: () =>
        new Promise<void>((resolve, reject) => {
          form.handleSubmit(
            async (values) => {
              try {
                await runValidatedSubmit(values);
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            () => {
              reject(new Error("Validation failed"));
            }
          )();
        }),
      reset: () => {
        form.reset(defaultValues);
      },
    }),
    [form, runValidatedSubmit, defaultValues]
  );

  return (
    <Form {...form}>
      <form
        onSubmit={handleFormSubmit}
        className={cn("flex flex-col h-full", className)}
      >
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {insideForm}
          <FieldGrid
            fields={fields}
            control={form.control}
            isSaving={isSaving}
            gap="gap-5"
          />
        </div>
      </form>
    </Form>
  );
}

const DetailFormWithRef = forwardRef(DetailFormInner);
DetailFormWithRef.displayName = "DetailForm";

export const DetailForm = DetailFormWithRef as <TValues extends FieldValues>(
  props: DetailFormProps<TValues> & { ref?: React.ForwardedRef<DetailFormHandle> }
) => React.ReactElement | null;
