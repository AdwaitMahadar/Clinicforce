"use client";

/**
 * components/common/DetailForm.tsx
 *
 * A generic field-driven form panel, wired to React Hook Form + Zod v4.
 * Designed for entity detail modals (Medicine, Patient, Appointment, etc.)
 *
 * Usage:
 * ```tsx
 * import { medicineSchema, type MedicineFormValues } from "@/lib/validators/medicine";
 *
 * <DetailForm<MedicineFormValues>
 *   schema={medicineSchema}
 *   defaultValues={{ name: "Amoxicillin", category: "Antibiotics" }}
 *   fields={[
 *     { name: "name",     label: "Medicine Name", type: "text" },
 *     { name: "category", label: "Category",      type: "select",
 *       options: [{ label: "Antibiotics", value: "Antibiotics" }] },
 *   ]}
 *   onSubmit={async (values) => { ... }}
 *   onDelete={async () => { ... }}
 *   onCancel={() => { ... }}
 * />
 * ```
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

// ─── Field descriptor types ────────────────────────────────────────────────────

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
  type: "text" | "date" | "email" | "number";
}

export interface TextareaField<TValues extends FieldValues> extends BaseField<TValues> {
  type: "textarea";
  rows?: number;
}

export interface SelectField<TValues extends FieldValues> extends BaseField<TValues> {
  type: "select";
  options: SelectOption[];
}

export type FormFieldDescriptor<TValues extends FieldValues> =
  | TextField<TValues>
  | TextareaField<TValues>
  | SelectField<TValues>;

// ─── Main component props ─────────────────────────────────────────────────────

export interface DetailFormProps<TValues extends FieldValues> {
  /** The Zod schema for the form — import from lib/validators/ */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: $ZodType<TValues, any>;
  /** Initial field values — usually the record fetched from the DB / mock */
  defaultValues: DefaultValues<TValues>;
  /** Field definitions that drive the rendered form */
  fields: FormFieldDescriptor<TValues>[];
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

// ─── Component ────────────────────────────────────────────────────────────────

export function DetailForm<TValues extends FieldValues>({
  schema,
  defaultValues,
  fields,
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
        {/* ── Scrollable field area ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 auto-rows-auto gap-5">
            {fields.map((descriptor) => (
              <div
                key={String(descriptor.name)}
                className={descriptor.colSpan === 2 ? "col-span-2" : "col-span-1"}
              >
                <FormField
                  control={form.control}
                  name={descriptor.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {descriptor.label}
                      </FormLabel>
                      <FormControl>
                        {descriptor.type === "textarea" ? (
                          <Textarea
                            rows={(descriptor as TextareaField<TValues>).rows ?? 5}
                            placeholder={descriptor.placeholder}
                            disabled={descriptor.disabled ?? isSaving}
                            className="resize-none text-sm"
                            style={{
                              background: "var(--color-surface-alt)",
                              color: "var(--color-text-primary)",
                            }}
                            {...field}
                            value={String(field.value ?? "")}
                          />
                        ) : descriptor.type === "select" ? (
                          <Select
                            disabled={descriptor.disabled ?? isSaving}
                            onValueChange={field.onChange}
                            defaultValue={String(field.value ?? "")}
                          >
                            <SelectTrigger
                              className="text-sm w-full"
                              style={{
                                background: "var(--color-surface-alt)",
                                color: "var(--color-text-primary)",
                              }}
                            >
                              <SelectValue
                                placeholder={
                                  descriptor.placeholder ??
                                  `Select ${descriptor.label.toLowerCase()}`
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {(descriptor as SelectField<TValues>).options.map(
                                (opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={descriptor.type}
                            placeholder={descriptor.placeholder}
                            disabled={descriptor.disabled ?? isSaving}
                            className="text-sm"
                            style={{
                              background: "var(--color-surface-alt)",
                              color: "var(--color-text-primary)",
                            }}
                            {...field}
                            value={String(field.value ?? "")}
                          />
                        )}
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Sticky footer ───────────────────────────────────────── */}
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
