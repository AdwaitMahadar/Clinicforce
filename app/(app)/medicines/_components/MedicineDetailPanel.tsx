"use client";

/**
 * app/(app)/medicines/_components/MedicineDetailPanel.tsx
 *
 * Supports two modes:
 *
 *   mode="edit"   (default)
 *     - Requires `medicine` prop (existing record)
 *     - 60/40 layout: form left, activity log right
 *     - Shows Delete Medicine button
 *
 *   mode="create"
 *     - `medicine` is omitted — all form fields start blank
 *     - Full-width form (no activity log column — nothing to log yet)
 *     - No Delete button
 *     - Submit label is "Add Medicine"
 *
 * Shared across:
 *   - medicines/[id]/page.tsx          ← edit, full-page fallback
 *   - @modal/(.)medicines/[id]/page.tsx ← edit, intercepting modal
 *   - medicines/new/page.tsx            ← create, full-page fallback
 *   - @modal/(.)medicines/new/page.tsx  ← create, intercepting modal
 */

import { Pill, Beaker, Syringe, FileText } from "lucide-react";
import { EventLog } from "@/components/common/EventLog";
import { DetailForm } from "@/components/common/DetailForm";
import type { FormFieldDescriptor } from "@/components/common/DetailForm";
import type { MedicineDetail } from "@/mock/medicines/detail";
import type { MedicineIcon } from "@/mock/medicines/dashboard";
import {
  medicineSchema,
  MEDICINE_CATEGORIES,
  MEDICINE_FORMS,
  type MedicineFormValues,
} from "@/lib/validators/medicine";

// ─── Icon resolver ─────────────────────────────────────────────────────────────

function MedicineIconDisplay({ iconName }: { iconName?: string }) {
  const cls = "size-5";
  switch (iconName) {
    case "medication_liquid": return <Beaker  className={cls} />;
    case "vaccines":          return <Syringe className={cls} />;
    case "prescriptions":     return <FileText className={cls} />;
    default:                  return <Pill    className={cls} />;
  }
}

function guessIcon(form?: string): MedicineIcon {
  const lower = (form ?? "").toLowerCase();
  if (lower === "syrup")     return "medication_liquid";
  if (lower === "injection") return "vaccines";
  return "pill";
}

// ─── Field definitions ────────────────────────────────────────────────────────

const MEDICINE_FIELDS: FormFieldDescriptor<MedicineFormValues>[] = [
  {
    name: "name",
    label: "Medicine Name",
    type: "text",
    placeholder: "e.g. Amoxicillin 500mg",
    colSpan: 2,
  },
  {
    name: "category",
    label: "Category",
    type: "select",
    options: MEDICINE_CATEGORIES.map((c) => ({ label: c, value: c })),
  },
  {
    name: "brand",
    label: "Brand",
    type: "text",
    placeholder: "e.g. MediLife Pharma",
  },
  {
    name: "form",
    label: "Form",
    type: "select",
    options: MEDICINE_FORMS.map((f) => ({ label: f, value: f })),
  },
  {
    name: "lastPrescribedDate",
    label: "Last Prescribed Date",
    type: "date",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    rows: 5,
    colSpan: 2,
    placeholder: "What is this medicine used for?",
  },
];

// ─── Blank defaults for create mode ──────────────────────────────────────────

const EMPTY_VALUES: MedicineFormValues = {
  name:               "",
  category:           MEDICINE_CATEGORIES[0],
  brand:              "",
  form:               MEDICINE_FORMS[0],
  lastPrescribedDate: "",
  description:        "",
};

// ─── Props ────────────────────────────────────────────────────────────────────

type EditProps = {
  mode: "edit";
  medicine: MedicineDetail;
  onClose?: () => void;
};

type CreateProps = {
  mode: "create";
  medicine?: never;
  onClose?: () => void;
};

type MedicineDetailPanelProps = EditProps | CreateProps;

// ─── Close button (shared) ────────────────────────────────────────────────────

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="size-8 rounded-lg flex items-center justify-center transition-colors focus:outline-none"
      style={{ color: "var(--color-text-muted)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--color-border)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
      }}
      aria-label="Close"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M1 1L13 13M13 1L1 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MedicineDetailPanel({ mode = "edit", medicine, onClose }: MedicineDetailPanelProps) {
  const isCreate = mode === "create";

  const iconName = guessIcon(medicine?.form);

  const defaultValues: MedicineFormValues = isCreate
    ? EMPTY_VALUES
    : {
        name:               medicine!.name,
        category:           medicine!.category as MedicineFormValues["category"],
        brand:              medicine!.brand,
        form:               medicine!.form as MedicineFormValues["form"],
        lastPrescribedDate: medicine!.lastPrescribedDate ?? "",
        description:        medicine!.description ?? "",
      };

  const handleSubmit = async (values: MedicineFormValues) => {
    if (isCreate) {
      // Phase 3: await createMedicine({ clinicId, ...values });
      console.log("Medicine created:", values);
    } else {
      // Phase 3: await updateMedicine({ id: medicine!.id, clinicId, ...values });
      console.log("Medicine updated:", values);
    }
    await new Promise((r) => setTimeout(r, 600));
    if (isCreate) onClose?.(); // close after creation
  };

  const handleDelete = async () => {
    // Phase 3: await deleteMedicine({ id: medicine!.id, clinicId });
    console.log("Medicine deleted:", medicine!.id);
    await new Promise((r) => setTimeout(r, 600));
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface-alt)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center border"
            style={{
              background: "var(--color-blue-bg)",
              borderColor: "var(--color-blue-border)",
              color: "var(--color-blue)",
            }}
          >
            <MedicineIconDisplay iconName={iconName} />
          </div>
          <div>
            <h3
              className="text-base font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {isCreate ? "New Medicine" : medicine!.name}
            </h3>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {isCreate ? "Fill in the details to add a new medicine" : "Edit Details"}
            </p>
          </div>
        </div>

        {onClose && <CloseButton onClose={onClose} />}
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Form — full-width in create mode, 60% in edit mode */}
        <div
          className="flex flex-col"
          style={{
            width: isCreate ? "100%" : "60%",
            borderRight: isCreate ? "none" : "1px solid var(--color-border)",
          }}
        >
          <DetailForm<MedicineFormValues>
            schema={medicineSchema}
            defaultValues={defaultValues}
            fields={MEDICINE_FIELDS}
            onSubmit={handleSubmit}
            onDelete={isCreate ? undefined : handleDelete}
            onCancel={onClose}
            submitLabel={isCreate ? "Add Medicine" : "Save Changes"}
            deleteLabel="Delete Medicine"
            successMessage={isCreate ? "Medicine added successfully." : "Medicine updated successfully."}
          />
        </div>

        {/* Activity log — only in edit mode */}
        {!isCreate && (
          <div
            className="flex flex-col overflow-hidden"
            style={{ width: "40%", background: "var(--color-surface-alt)" }}
          >
            <div
              className="px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--color-text-muted)" }}
              >
                Activity Log
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <EventLog
                events={medicine!.activityLog}
                maxHeight="100%"
                className="h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
