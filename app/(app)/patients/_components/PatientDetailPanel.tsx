"use client";

/**
 * app/(app)/patients/_components/PatientDetailPanel.tsx
 *
 * Dual-mode patient panel:
 *
 *   mode="view"   — 3-column read-only record view
 *                   Left  (35%) Personal · Medical · Emergency
 *                   Mid   (40%) Tabbed: Documents | Appointments
 *                   Right (25%) Clinical notes textarea + Activity log
 *
 *   mode="create" — Single scrollable form (2-column grid)
 *                   All fields editable · Clinical notes inline · Save / Cancel
 *                   No documents, appointments, or activity log
 *
 * onClose is only passed in modal context; in the full-page view it is omitted.
 */

import { useState, useCallback } from "react";
import {
  User, FileText, Phone, Mail, HeartPulse, AlertTriangle,
  CalendarDays, File, FileSpreadsheet, Image, Download, Plus, X,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { InitialsBadge, StatusBadge, EventLog } from "@/components/common";
import type { PatientDetail, PatientDocument } from "@/types/patient";
import { createPatient } from "@/lib/actions/patients";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PatientDetailPanelProps {
  mode: "view" | "create";
  patient?: PatientDetail;            // required in view mode
  onClose?: () => void;               // present in modal context only
}

// ─── Appointment status styles ────────────────────────────────────────────────

const APPT_STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: { bg: "var(--color-blue-bg)",   text: "var(--color-blue)",   border: "var(--color-blue-bg)"   },
  completed:  { bg: "var(--color-green-bg)",  text: "var(--color-green)",  border: "var(--color-green-bg)"  },
  cancelled:  { bg: "var(--color-red-bg)",    text: "var(--color-red)",    border: "var(--color-red-bg)"    },
  "no-show":  { bg: "var(--color-amber-bg)",  text: "var(--color-amber)",  border: "var(--color-amber-bg)"  },
};

// ─── File type icon ───────────────────────────────────────────────────────────

function DocIcon({ type }: { type: PatientDocument["type"] }) {
  const styles = {
    pdf:   { icon: <FileText size={18} />,        bg: "#fee2e2", color: "#ef4444" },
    doc:   { icon: <File size={18} />,            bg: "#eff6ff", color: "#3b82f6" },
    xls:   { icon: <FileSpreadsheet size={18} />, bg: "#ecfdf5", color: "#10b981" },
    img:   { icon: <Image size={18} />,           bg: "#f5f3ff", color: "#8b5cf6" },
    other: { icon: <File size={18} />,            bg: "#f4f4f5", color: "#71717a" },
  };
  const s = styles[type] ?? styles.other;
  return (
    <div className="size-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.bg, color: s.color }}>
      {s.icon}
    </div>
  );
}

// ─── Read-only field (view mode) ──────────────────────────────────────────────

function Field({
  label, value, action, highlight, className = "",
}: {
  label: string;
  value: string | null | undefined;
  action?: React.ReactNode;
  highlight?: "danger";
  className?: string;
}) {
  const dangerStyle = { background: "var(--color-red-bg)", border: "1px solid var(--color-red-bg)", color: "var(--color-red)" };
  const defaultStyle = { background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" };
  return (
    <div className={className}>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</label>
      <div className="w-full px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2" style={highlight === "danger" ? dangerStyle : defaultStyle}>
        <span className="font-medium">{value || "—"}</span>
        {action}
      </div>
    </div>
  );
}

// ─── Editable input field (create mode) ──────────────────────────────────────

function InputField({
  label, name, placeholder = "", type = "text", required = false, className = "", as,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
  as?: "textarea" | "select";
}) {
  const sharedStyle: React.CSSProperties = {
    background:  "var(--color-surface)",
    border:      "1px solid var(--color-border)",
    color:       "var(--color-text-primary)",
    outline:     "none",
  };

  return (
    <div className={className}>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
        {label}{required && <span style={{ color: "var(--color-red)" }}> *</span>}
      </label>
      {as === "textarea" ? (
        <textarea
          name={name}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-colors focus:ring-1"
          style={sharedStyle}
        />
      ) : as === "select" ? (
        // placeholder — real options wired in Phase 3
        <select name={name} className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:ring-1 appearance-none" style={sharedStyle}>
          <option value="">Select…</option>
        </select>
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg text-sm transition-colors focus:ring-1"
          style={sharedStyle}
        />
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 mb-4 pt-5 pb-0"
      style={{ color: "var(--color-text-secondary)", borderTop: "1px solid var(--color-border)" }}>
      <Icon size={14} />{title}
    </h3>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PatientDetailPanel({ mode, patient, onClose }: PatientDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"documents" | "appointments">("documents");
  const handleClose = useCallback(() => onClose?.(), [onClose]);

  const handleCreateSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string) || undefined;
    const result = await createPatient({
      firstName:            fd.get("firstName") as string,
      lastName:             fd.get("lastName")  as string,
      email:                get("email"),
      phone:                get("phone"),
      dateOfBirth:          get("dateOfBirth"),
      gender:               (get("gender") as "male" | "female" | "other") ?? "other",
      address:              get("address"),
      bloodGroup:           get("bloodGroup") as "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | undefined,
      allergies:            get("allergies"),
      emergencyContactName: get("emergencyContactName"),
      emergencyContactPhone:get("emergencyContactPhone"),
      notes:                get("notes"),
    });
    if (result.success) {
      toast.success("Patient registered successfully.");
      onClose?.();
    } else {
      toast.error(result.error ?? "Failed to register patient.");
    }
  }, [onClose]);

  // ── CREATE MODE ──────────────────────────────────────────────────────────────
  if (mode === "create") {
    return (
      <div className="h-full flex flex-col overflow-hidden">

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-glass-fill)" }}
        >
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              New Patient
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Fill in the details below to register a new patient record.
            </p>
          </div>
          {onClose && (
            <button
              onClick={handleClose}
              className="size-9 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "var(--color-text-muted)" }}
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto p-8">
          <form className="max-w-3xl mx-auto space-y-6" onSubmit={handleCreateSubmit}>

            {/* ── Personal Information ── */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 mb-4"
                style={{ color: "var(--color-text-secondary)" }}>
                <User size={14} /> Personal Information
              </h3>
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <InputField label="First Name" name="firstName" placeholder="Michael" required />
                <InputField label="Last Name"  name="lastName"  placeholder="Ross"    required />
                <InputField label="Address" name="address" placeholder="123 Maple Avenue, Springfield, IL 62704" className="col-span-2" />
                <InputField label="Date of Birth" name="dateOfBirth" type="date" required />
                <InputField label="Gender" name="gender" as="select" required />
                <InputField label="Phone" name="phone" placeholder="(555) 123-4567" type="tel" className="col-span-2" required />
                <InputField label="Email" name="email" placeholder="patient@example.com" type="email" className="col-span-2" required />
              </div>
            </div>

            {/* ── Medical Context ── */}
            <SectionHeader icon={HeartPulse} title="Medical Context" />
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 mt-4">
              <InputField label="Blood Group" name="bloodGroup" placeholder="O+" />
              <InputField label="Allergies"   name="allergies"  placeholder="e.g. Penicillin, Peanuts (or leave blank)" />
            </div>

            {/* ── Emergency Contact ── */}
            <SectionHeader icon={AlertTriangle} title="Emergency Contact" />
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 mt-4">
              <InputField label="Contact Name"  name="emergencyContactName"  placeholder="Sarah Ross (Wife)" />
              <InputField label="Contact Phone" name="emergencyContactPhone" placeholder="(555) 987-6543" type="tel" />
            </div>

            {/* ── Clinical Notes ── */}
            <SectionHeader icon={FileText} title="Clinical Notes" />
            <div className="mt-4">
              <InputField
                label="Initial Notes"
                name="notes"
                as="textarea"
                placeholder="Add any initial clinical notes, referral reasons, or relevant background…"
                className="col-span-2"
              />
            </div>

          </form>
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center justify-end gap-3 px-8 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-glass-fill)" }}
        >
          {onClose && (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: "var(--color-surface)",
                border:     "1px solid var(--color-border)",
                color:      "var(--color-text-secondary)",
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
            style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
          >
            <Save size={15} />
            Save Patient
          </button>
        </div>
      </div>
    );
  }

  // ── VIEW MODE ────────────────────────────────────────────────────────────────
  if (!patient) return null;
  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-glass-fill)" }}
      >
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

        {onClose && (
          <button
            onClick={handleClose}
            className="size-9 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            title="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Body — 3 columns */}
      <div className="flex-1 overflow-hidden flex">

        {/* Left: Personal + Medical + Emergency */}
        <div className="w-[35%] overflow-y-auto p-6 flex flex-col gap-6 flex-shrink-0"
          style={{ borderRight: "1px solid var(--color-border)" }}>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 mb-4"
              style={{ color: "var(--color-text-secondary)" }}>
              <User size={14} /> Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="First Name"    value={patient.firstName} />
              <Field label="Last Name"     value={patient.lastName}  />
              <Field label="Address"       value={patient.address}   className="col-span-2" />
              <Field label="Date of Birth" value={patient.dateOfBirth} />
              <Field label="Gender"        value={patient.gender} />
              <Field label="Phone" value={patient.phone} className="col-span-2"
                action={<Phone size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />} />
              <Field label="Email" value={patient.email} className="col-span-2"
                action={<Mail size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />} />
            </div>
          </section>

          <section className="pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 mb-4"
              style={{ color: "var(--color-text-secondary)" }}>
              <HeartPulse size={14} /> Medical Context
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Blood Group" value={patient.bloodGroup} />
              <Field label="Allergies" value={patient.allergies ?? "None"}
                highlight={patient.allergies ? "danger" : undefined} />
            </div>
          </section>

          <section className="pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2 mb-4"
              style={{ color: "var(--color-text-secondary)" }}>
              <AlertTriangle size={14} /> Emergency Contact
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Contact Name"  value={patient.emergencyContactName}  />
              <Field label="Contact Phone" value={patient.emergencyContactPhone} />
            </div>
          </section>
        </div>

        {/* Mid: Documents | Appointments tabs */}
        <div className="w-[40%] flex flex-col flex-shrink-0"
          style={{ borderRight: "1px solid var(--color-border)", background: "var(--color-surface-alt)" }}>

          {/* Tab bar */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-glass-fill)" }}>
            <div className="flex gap-4">
              {(["documents", "appointments"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex items-center gap-1.5 text-sm font-semibold pb-1 border-b-2 transition-colors capitalize"
                  style={{
                    color:       activeTab === tab ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    borderColor: activeTab === tab ? "var(--color-text-primary)" : "transparent",
                  }}
                >
                  {tab === "documents"    && <FileText size={15} />}
                  {tab === "appointments" && <CalendarDays size={15} />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <button
              className="size-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
              title="Add new"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">

            {activeTab === "documents" && (
              patient.documents.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: "var(--color-text-muted)" }}>
                  No documents uploaded yet.
                </p>
              ) : patient.documents.map((doc) => (
                <div key={doc.id}
                  className="group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <DocIcon type={doc.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{doc.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {doc.size} · Uploaded {doc.uploadedAt}
                    </p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                    style={{ color: "var(--color-text-muted)" }}>
                    <Download size={15} />
                  </button>
                </div>
              ))
            )}

            {activeTab === "appointments" && (
              patient.appointments.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: "var(--color-text-muted)" }}>
                  No appointments recorded.
                </p>
              ) : patient.appointments.map((appt) => {
                const s = APPT_STATUS_STYLES[appt.status] ?? APPT_STATUS_STYLES.completed;
                return (
                  <div key={appt.id}
                    className="flex flex-col gap-2 p-3 rounded-xl cursor-pointer transition-all"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", opacity: appt.status === "cancelled" ? 0.7 : 1 }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>{appt.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{appt.doctor}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap flex-shrink-0 capitalize"
                        style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                        {appt.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      <span className="flex items-center gap-1"><CalendarDays size={12} /> {appt.date}</span>
                      <span>{appt.time}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Clinical Notes + Activity Log */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Clinical Notes</h3>
              <button className="text-xs font-medium" style={{ color: "var(--color-blue)" }}>Add Note</button>
            </div>
            <textarea
              className="w-full rounded-lg p-3 text-sm resize-none h-24 focus:outline-none transition-colors"
              placeholder="Add a quick note about the patient..."
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>Activity Log</h3>
            <EventLog events={patient.activityLog} maxHeight="100%" />
          </div>
        </div>

      </div>
    </div>
  );
}
