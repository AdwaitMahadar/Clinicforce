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
 * descriptor; optional `constrainControlToHalfRow` with `colSpan: 2` for a full-width
 * row whose control is only as wide as one column). Entity side columns (e.g. documents)
 * are composed by the parent next to this component (e.g. via `DetailPanel`).
 *
 * ─── Imperative API ────────────────────────────────────────────────────────────
 *
 * `forwardRef` + `DetailFormHandle`: `submit()` runs validation and `onSubmit`;
 * `reset()` resets to `defaultValues`. Footer actions live in the parent.
 *
 * ─── Field types ──────────────────────────────────────────────────────────────
 *
 *   "text" | "date" | "email" | "number" | "time"  → <Input type={…} /> (optional `prefix` → input-group shell: muted prepended label + shared border)
 *   "textarea"                                      → <Textarea /> (optional `rows`, `className` on descriptor)
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
  /**
   * Use with `colSpan: 2`: the grid cell spans the full row, but the control is
   * limited to ~one column width (left half), leaving the right half empty.
   */
  constrainControlToHalfRow?: boolean;
}

export interface TextField<TValues extends FieldValues> extends BaseField<TValues> {
  type: "text" | "date" | "email" | "number" | "time";
  /**
   * When set, wraps `<Input />` in a single bordered control with a non-editable
   * prefix (e.g. currency `₹`, units). Uses `focus-within` ring on the shell.
   */
  prefix?: string;
  /** For `type: "number"` only — passed to `<Input />`. */
  step?: string;
  min?: string;
}

export interface TextareaField<TValues extends FieldValues> extends BaseField<TValues> {
  type: "textarea";
  rows?: number;
  /** Merged with the default textarea classes (e.g. `min-h-[…]` for a taller control). */
  className?: string;
}

export interface SelectField<TValues extends FieldValues> extends BaseField<TValues> {
  type: "select";
  options: SelectOption[];
  /** Merged onto `<SelectContent />` (e.g. cap dropdown height for long option lists). */
  selectContentClassName?: string;
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
    const ta = descriptor as TextareaField<TValues>;
    return (
      <Textarea
        rows={ta.rows ?? 5}
        placeholder={descriptor.placeholder}
        disabled={descriptor.disabled ?? isSaving}
        className={cn("resize-none", ta.className)}
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
        <SelectContent
          className={(descriptor as SelectField<TValues>).selectContentClassName}
        >
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
  const tf = descriptor as TextField<TValues>;
  const disabled = descriptor.disabled ?? isSaving;
  const numberExtra =
    descriptor.type === "number"
      ? { step: tf.step ?? undefined, min: tf.min ?? undefined }
      : {};

  const inputNode = (
    <Input
      type={descriptor.type}
      placeholder={descriptor.placeholder}
      disabled={disabled}
      {...field}
      value={String(field.value ?? "")}
      {...numberExtra}
      className={cn(
        tf.prefix &&
          "h-9 min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      )}
    />
  );

  if (tf.prefix) {
    return (
      <div
        className={cn(
          "flex h-9 w-full min-w-0 items-stretch rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] dark:bg-input/30",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <span
          className="flex shrink-0 items-center border-r border-input px-2.5 text-sm text-muted-foreground select-none"
          aria-hidden="true"
        >
          {tf.prefix}
        </span>
        {inputNode}
      </div>
    );
  }

  return inputNode;
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
                  {descriptor.constrainControlToHalfRow ? (
                    <div className="w-full max-w-[calc(50%-0.625rem)]">
                      {renderFieldControl(descriptor, field, isSaving)}
                    </div>
                  ) : (
                    renderFieldControl(descriptor, field, isSaving)
                  )}
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
