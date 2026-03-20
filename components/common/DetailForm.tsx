"use client";

/**
 * components/common/DetailForm.tsx
 *
 * A generic field-driven form panel, wired to React Hook Form + Zod v4.
 * Designed for entity detail modals (Medicine, Patient, Appointment, etc.)
 *
 * ─── Two layout modes ────────────────────────────────────────────────────────
 *
 * 1. FLAT (original) — pass `fields`:
 *    Renders a single scrollable 2-column grid. Used by MedicineDetailPanel.
 *
 *    <DetailForm fields={[...]} ... />
 *
 * 2. SECTIONED — pass `sections`:
 *    Renders side-by-side columns, each with its own title, field grid, and
 *    optional background. Used by AppointmentDetailPanel.
 *    `rightSlot` lets you inject a read-only panel (e.g. Documents + Activity
 *    Log) as a third column that sits alongside but outside the form itself.
 *
 *    <DetailForm
 *      sections={[
 *        { title: "Primary Info", width: "30%", borderRight: true, fields: [...] },
 *        { title: "Timeline & Notes", background: "var(--color-surface-alt)", fields: [...] },
 *      ]}
 *      rightSlot={<DocumentsAndLog />}
 *      ...
 *    />
 *
 * ─── Field types ──────────────────────────────────────────────────────────────
 *
 *   "text" | "date" | "email" | "number" | "time"  → <Input type={…} />
 *   "textarea"                                      → <Textarea />
 *   "select"                                        → <Select />
 *   "custom"  (requires renderControl)              → caller-supplied JSX
 *
 * Rules:
 * - All colours come from CSS variables — no hardcoded hex values
 * - Toasts use Sonner (toast from "sonner")
 * - Zod schemas live in lib/validators/ — passed as props, not inlined
 */

import React, { useState } from "react";
import {
  useForm,
  type FieldValues,
  type DefaultValues,
  type Path,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { $ZodType } from "zod/v4/core";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

// ─── Section type (for multi-column / sectioned layouts) ──────────────────────

export interface FormSection<TValues extends FieldValues> {
  /** Rendered as a small uppercase heading above the field grid */
  title?: string;
  /** Fields rendered in this column's 2-col sub-grid */
  fields: FormFieldDescriptor<TValues>[];
  /** Column background — CSS variable or any valid CSS colour value */
  background?: string;
  /**
   * Fixed column width (e.g. "30%"). When omitted the column uses
   * `flex: 1` and expands to fill available space.
   */
  width?: string;
  /** When true, draws a right border separating this column from the next */
  borderRight?: boolean;
}

// ─── Main component props ─────────────────────────────────────────────────────

export interface DetailFormProps<TValues extends FieldValues> {
  /** The Zod schema for the form — import from lib/validators/ */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: $ZodType<TValues, any>;
  /** Initial field values — usually the record fetched from the DB */
  defaultValues: DefaultValues<TValues>;

  /**
   * FLAT mode — a single scrollable 2-column grid.
   * Mutually exclusive with `sections`.
   */
  fields?: FormFieldDescriptor<TValues>[];

  /**
   * SECTIONED mode — side-by-side columns, each with their own field grid.
   * Mutually exclusive with `fields`.
   */
  sections?: FormSection<TValues>[];

  /**
   * Content rendered as an extra column to the RIGHT of the section columns.
   * Rendered inside the form's flex container but outside the scrollable
   * field area — ideal for read-only panels (Documents, Activity Log) that
   * are separate from the form's save/submit lifecycle.
   * Only valid when `sections` is provided.
   */
  rightSlot?: React.ReactNode;

  /** Called with validated values on submit */
  onSubmit: (values: TValues) => Promise<void>;
  /** Optional delete handler — shows delete button when provided */
  onDelete?: () => Promise<void>;
  /** Called when Cancel / close is requested */
  onCancel?: () => void;
  /** Label for the save button. Default: "Save Changes" */
  submitLabel?: string;
  /** Label for the delete button. Default: "Delete" */
  deleteLabel?: string;
  /** Success Sonner toast message. Default: "Changes saved." */
  successMessage?: string;
  className?: string;
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
    return (
      <Select
        disabled={descriptor.disabled ?? isSaving}
        onValueChange={field.onChange}
        defaultValue={String(field.value ?? "")}
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

// ─── Field grid (shared between flat and sectioned modes) ─────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export function DetailForm<TValues extends FieldValues>({
  schema,
  defaultValues,
  fields,
  sections,
  rightSlot,
  onSubmit,
  onDelete,
  onCancel,
  submitLabel = "Save Changes",
  deleteLabel = "Delete",
  successMessage = "Changes saved.",
  className,
}: DetailFormProps<TValues>) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<TValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues,
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsSaving(true);
    try {
      await onSubmit(values);
      toast.success(successMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  });

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      toast.success("Record deleted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit}
        className={cn("flex flex-col h-full", className)}
      >

        {/* ── SECTIONED body (multi-column) ──────────────────────── */}
        {sections ? (
          <div className="flex flex-1 min-h-0">
            {sections.map((section, idx) => (
              <div
                key={idx}
                className="flex flex-col overflow-y-auto p-6 gap-4"
                style={{
                  ...(section.width
                    ? { width: section.width, flexShrink: 0 }
                    : { flex: 1 }),
                  background: section.background,
                  borderRight: section.borderRight
                    ? "1px solid var(--color-border)"
                    : undefined,
                }}
              >
                {section.title && (
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {section.title}
                  </p>
                )}
                <FieldGrid
                  fields={section.fields}
                  control={form.control}
                  isSaving={isSaving}
                  gap="gap-4"
                />
              </div>
            ))}

            {/* Read-only right panel (Documents, Activity Log, etc.) */}
            {rightSlot}
          </div>
        ) : (
          /* ── FLAT body (single scrollable grid) ─────────────────── */
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <FieldGrid
              fields={fields ?? []}
              control={form.control}
              isSaving={isSaving}
              gap="gap-5"
            />
          </div>
        )}

        {/* ── Sticky footer ─────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          {/* Delete (left) */}
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="text-sm gap-2"
              style={{ color: "var(--color-red)" }}
            >
              {isDeleting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              {deleteLabel}
            </Button>
          ) : (
            <div />
          )}

          {/* Cancel + Save (right) */}
          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isSaving || isDeleting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || isDeleting}
              className="gap-2"
              style={{
                background: "var(--color-ink)",
                color: "var(--color-ink-fg)",
              }}
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
