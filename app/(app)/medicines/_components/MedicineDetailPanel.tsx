"use client";

/**
 * app/(app)/medicines/_components/MedicineDetailPanel.tsx
 *
 * DetailPanel + DetailForm (flat fields) + DetailSidebar (activity log only in edit).
 *
 *   mode="edit"   — sidebar column with activity log; Delete in footer
 *   mode="create" — full-width form; no sidebar; no Delete
 *
 * Shared across:
 *   - medicines/view/[id]/page.tsx
 *   - @modal/(.)medicines/view/[id]/page.tsx
 *   - medicines/new/page.tsx
 *   - @modal/(.)medicines/new/page.tsx
 */

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Pill, Beaker, Syringe, FileText } from "lucide-react";
import { toast } from "sonner";
import { DetailPanel, DetailForm, PanelCloseButton } from "@/components/common";
import type { DetailFormHandle } from "@/components/common/DetailForm";
import type { FormFieldDescriptor } from "@/components/common/DetailForm";
import type { MedicineDetail } from "@/types/medicine";
import type { MedicineIcon } from "@/types/medicine";
import {
  createMedicineSchema,
  MEDICINE_CATEGORIES,
  MEDICINE_FORMS,
  type CreateMedicineInput,
} from "@/lib/validators/medicine";
import {
  createMedicine,
  updateMedicine,
  deactivateMedicine,
} from "@/lib/actions/medicines";


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

const MEDICINE_FIELDS: FormFieldDescriptor<CreateMedicineInput>[] = [
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

const EMPTY_VALUES: CreateMedicineInput = {
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

// ─── Component ────────────────────────────────────────────────────────────────

export function MedicineDetailPanel({ mode = "edit", medicine, onClose }: MedicineDetailPanelProps) {
  const isCreate = mode === "create";
  const router = useRouter();
  const formRef = useRef<DetailFormHandle | null>(null);

  const iconName = guessIcon(medicine?.form);

  const defaultValues: CreateMedicineInput = isCreate
    ? EMPTY_VALUES
    : {
        name:               medicine!.name,
        category:           medicine!.category as CreateMedicineInput["category"],
        brand:              medicine!.brand,
        form:               medicine!.form as CreateMedicineInput["form"],
        lastPrescribedDate: medicine!.lastPrescribedDate ?? "",
        description:        medicine!.description ?? "",
      };

  const handleSubmit = async (values: CreateMedicineInput) => {
    if (isCreate) {
      const result = await createMedicine(values);
      if (result.success) {
        toast.success("Medicine added successfully.");
        if (onClose) {
          onClose();
        } else {
          router.push("/medicines/dashboard");
        }
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to add medicine.");
      }
    } else {
      const result = await updateMedicine({ id: medicine!.id, ...values });
      if (result.success) {
        toast.success("Medicine updated successfully.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update medicine.");
      }
    }
  };

  const handleDelete = async () => {
    const result = await deactivateMedicine(medicine!.id);
    if (result.success) {
      toast.success("Medicine deactivated.");
      onClose?.();
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to deactivate medicine.");
    }
  };

  const header = (
    <>
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

      {onClose && <PanelCloseButton onClose={onClose} />}
    </>
  );

  const form = (
    <DetailForm<CreateMedicineInput>
      ref={formRef}
      schema={createMedicineSchema}
      defaultValues={defaultValues}
      fields={MEDICINE_FIELDS}
      onSubmit={handleSubmit}
    />
  );

  return (
    <DetailPanel
      header={header}
      formRef={formRef}
      form={form}
      events={isCreate ? [] : medicine!.activityLog}
      isCreate={isCreate}
      onCancel={onClose ?? (() => router.back())}
      onDelete={isCreate ? undefined : handleDelete}
      submitLabel={isCreate ? "Add Medicine" : "Save Changes"}
      deleteLabel="Delete Medicine"
    />
  );
}
