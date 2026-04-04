"use client";

/**
 * app/(app)/patients/_components/PatientDetailPanel.tsx
 *
 * DetailPanel + DetailForm (flat fields) + DetailSidebar (documents / appointments tabs + activity log).
 *
 *   mode="view"   — editable form + sidebar
 *   mode="create" — new patient form; no sidebar
 */

import { useRef, useState } from "react";
import type { DefaultValues } from "react-hook-form";
import { useRouter } from "next/navigation";
import { differenceInYears, isValid, parseISO } from "date-fns";
import {
  FileText,
  CalendarDays,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  InitialsBadge,
  StatusBadge,
  DocumentCard,
  UploadDocumentDialog,
  DetailPanel,
  DetailForm,
  PanelCloseButton,
} from "@/components/common";
import type { DetailFormHandle } from "@/components/common/DetailForm";
import type { FormFieldDescriptor } from "@/components/common/DetailForm";
import type { PatientDetail } from "@/types/patient";
import {
  createPatientSchema,
  updatePatientSchema,
  PATIENT_GENDERS,
  type CreatePatientInput,
  type UpdatePatientInput,
} from "@/lib/validators/patient";
import { PATIENT_BLOOD_GROUPS } from "@/lib/constants/patient";
import { createPatient, updatePatient } from "@/lib/actions/patients";
import { usePermission } from "@/lib/auth/session-context";
import { PatientDobAgeSync } from "./PatientDobAgeSync";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PatientDetailPanelProps {
  mode: "view" | "create";
  patient?: PatientDetail;
  onClose?: () => void;
}

// ─── Appointment status styles ────────────────────────────────────────────────

const APPT_STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: { bg: "var(--color-amber-bg)",   text: "var(--color-amber)",   border: "var(--color-amber-border)"   },
  completed: { bg: "var(--color-blue-bg)",    text: "var(--color-blue)",    border: "var(--color-blue-border)"    },
  cancelled: { bg: "var(--color-red-bg)",    text: "var(--color-red)",     border: "var(--color-red-border)"     },
  "no-show": { bg: "var(--color-purple-bg)", text: "var(--color-purple)", border: "var(--color-purple-border)" },
};

// ─── Gender / blood options for DetailForm selects ─────────────────────────────

const GENDER_OPTION_LABEL: Record<(typeof PATIENT_GENDERS)[number], string> = {
  male:   "Male",
  female: "Female",
  other:  "Other",
};

const GENDER_SELECT_OPTIONS = PATIENT_GENDERS.map((value) => ({
  value,
  label: GENDER_OPTION_LABEL[value],
}));

const BLOOD_GROUP_OPTIONS = PATIENT_BLOOD_GROUPS.map((b) => ({
  label: b,
  value: b,
}));

function patientGenderToForm(g: PatientDetail["gender"]): "male" | "female" | "other" {
  if (g === "Male") return "male";
  if (g === "Female") return "female";
  if (g === "Other") return "other";
  return "other";
}

/** Display-only age for the form (derived from stored DOB until the user edits). */
function ageStringFromBirthIso(iso: string | undefined): string {
  const t = iso?.trim();
  if (!t) return "";
  try {
    const d = parseISO(t.slice(0, 10));
    if (!isValid(d)) return "";
    return String(differenceInYears(new Date(), d));
  } catch {
    return "";
  }
}

// ─── Field grid (matches previous create form layout: 2-column grid) ─────────

const PATIENT_FIELDS: FormFieldDescriptor<CreatePatientInput>[] = [
  { name: "firstName", label: "First Name", type: "text", placeholder: "Michael" },
  { name: "lastName", label: "Last Name", type: "text", placeholder: "Ross" },
  {
    name: "address",
    label: "Address",
    type: "text",
    colSpan: 2,
    placeholder: "123 Maple Avenue, Springfield, IL 62704",
  },
  { name: "dateOfBirth", label: "Date of Birth", type: "date" },
  {
    name: "age",
    label: "Age",
    type: "number",
    placeholder: "Years",
  },
  {
    name: "gender",
    label: "Gender",
    type: "select",
    colSpan: 2,
    constrainControlToHalfRow: true,
    options: GENDER_SELECT_OPTIONS,
  },
  {
    name: "phone",
    label: "Phone",
    type: "text",
    placeholder: "(555) 123-4567",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "patient@example.com",
  },
  {
    name: "bloodGroup",
    label: "Blood Group",
    type: "select",
    placeholder: "—",
    options: BLOOD_GROUP_OPTIONS,
  },
  {
    name: "allergies",
    label: "Allergies",
    type: "text",
    placeholder: "e.g. Penicillin, Peanuts (or leave blank)",
  },
  {
    name: "emergencyContactName",
    label: "Contact Name",
    type: "text",
    placeholder: "Sarah Ross (Wife)",
  },
  {
    name: "emergencyContactPhone",
    label: "Contact Phone",
    type: "text",
    placeholder: "(555) 987-6543",
  },
  {
    name: "pastHistoryNotes",
    label: "Patient's Past History",
    type: "textarea",
    rows: 12,
    colSpan: 2,
    className: "min-h-[220px]",
    placeholder:
      "Relevant medical history, referrals, or background for clinical context…",
  },
];

const EMPTY_CREATE: DefaultValues<CreatePatientInput> = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  age: undefined,
  gender: "male",
  address: "",
  bloodGroup: undefined,
  allergies: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  pastHistoryNotes: "",
};

// ─── Sidebar tab: Documents ───────────────────────────────────────────────────

function PatientDocumentsTab({ patient }: { patient: PatientDetail }) {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="size-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          title="Upload document"
        >
          <Plus size={14} />
        </button>
      </div>
      {patient.documents.length === 0 ? (
        <p className="text-sm text-center py-10" style={{ color: "var(--color-text-muted)" }}>
          No documents uploaded yet.
        </p>
      ) : (
        patient.documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} />
        ))
      )}
      <UploadDocumentDialog
        patientId={patient.id}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </>
  );
}

// ─── Sidebar tab: Appointments ────────────────────────────────────────────────

function PatientAppointmentsTab({ patient }: { patient: PatientDetail }) {
  if (patient.appointments.length === 0) {
    return (
      <p className="text-sm text-center py-10" style={{ color: "var(--color-text-muted)" }}>
        No appointments recorded.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {patient.appointments.map((appt) => {
        const s = APPT_STATUS_STYLES[appt.status] ?? APPT_STATUS_STYLES.completed;
        return (
          <div
            key={appt.id}
            className="flex flex-col gap-2 p-3 rounded-xl cursor-pointer transition-all"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", opacity: appt.status === "cancelled" ? 0.7 : 1 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>{appt.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{appt.doctor}</p>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 capitalize"
                style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
              >
                {appt.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              <span className="flex items-center gap-1"><CalendarDays size={12} /> {appt.date}</span>
              <span>{appt.time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PatientDetailPanel({ mode, patient, onClose }: PatientDetailPanelProps) {
  const router = useRouter();
  const formRef = useRef<DetailFormHandle | null>(null);

  const isCreate = mode === "create";
  const canViewClinicalNotes = usePermission("viewClinicalNotes");
  const visibleFields = canViewClinicalNotes
    ? PATIENT_FIELDS
    : PATIENT_FIELDS.filter((f) => f.name !== "pastHistoryNotes");

  const viewDefaultValues: UpdatePatientInput | null = patient
    ? ({
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirthIso ?? "",
        age: (() => {
          const s = ageStringFromBirthIso(patient.dateOfBirthIso);
          return s === "" ? undefined : Number(s);
        })(),
        gender: patientGenderToForm(patient.gender),
        address: patient.address,
        bloodGroup: patient.bloodGroup
          ? (patient.bloodGroup as UpdatePatientInput["bloodGroup"])
          : undefined,
        allergies: patient.allergies ?? "",
        emergencyContactName: patient.emergencyContactName,
        emergencyContactPhone: patient.emergencyContactPhone,
        pastHistoryNotes: patient.pastHistoryNotes ?? "",
      } satisfies UpdatePatientInput)
    : null;

  const handleSubmitCreate = async (values: CreatePatientInput) => {
    const result = await createPatient(values);
    if (result.success) {
      toast.success("Patient registered successfully.");
      if (onClose) {
        onClose();
      } else {
        router.push("/patients/dashboard");
      }
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to register patient.");
    }
  };

  const handleSubmitUpdate = async (values: UpdatePatientInput) => {
    const result = await updatePatient(values);
    if (result.success) {
      toast.success("Patient updated successfully.");
      if (onClose) {
        onClose();
      }
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update patient.");
    }
  };

  // ── CREATE MODE ────────────────────────────────────────────────────────────
  if (isCreate) {
    const header = (
      <>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            New Patient
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Fill in the details below to register a new patient record.
          </p>
        </div>
        {onClose && <PanelCloseButton onClose={onClose} />}
      </>
    );

    const form = (
      <DetailForm<CreatePatientInput>
        ref={formRef}
        schema={createPatientSchema}
        defaultValues={EMPTY_CREATE}
        fields={visibleFields}
        insideForm={<PatientDobAgeSync />}
        onSubmit={handleSubmitCreate}
      />
    );

    return (
      <DetailPanel
        header={header}
        formRef={formRef}
        form={form}
        events={[]}
        isCreate
        onCancel={onClose ?? (() => router.back())}
        submitLabel="Save Patient"
      />
    );
  }

  // ── VIEW MODE ──────────────────────────────────────────────────────────────
  if (!patient || !viewDefaultValues) return null;

  const fullName = `${patient.firstName} ${patient.lastName}`;

  const header = (
    <>
      <div className="flex items-center gap-4">
        <InitialsBadge name={fullName} size="lg" />
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>{fullName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="font-mono text-xs px-2 py-0.5 rounded-md"
              style={{ background: "var(--color-surface-alt)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
            >
              {patient.chartId}
            </span>
            <StatusBadge status={patient.status} />
          </div>
        </div>
      </div>
      {onClose && <PanelCloseButton onClose={onClose} />}
    </>
  );

  const form = (
    <DetailForm<UpdatePatientInput>
      ref={formRef}
      schema={updatePatientSchema}
      defaultValues={viewDefaultValues}
      fields={visibleFields as FormFieldDescriptor<UpdatePatientInput>[]}
      insideForm={<PatientDobAgeSync />}
      onSubmit={handleSubmitUpdate}
    />
  );

  return (
    <DetailPanel
      header={header}
      formRef={formRef}
      form={form}
      events={patient.activityLog}
      sidebarTabs={[
        {
          label: "Documents",
          icon: FileText,
          content: <PatientDocumentsTab patient={patient} />,
        },
        {
          label: "Appointments",
          icon: CalendarDays,
          content: <PatientAppointmentsTab patient={patient} />,
        },
      ]}
      isCreate={false}
      onCancel={onClose ?? (() => router.back())}
      submitLabel="Save Changes"
    />
  );
}
