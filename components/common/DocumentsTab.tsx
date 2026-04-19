"use client";

/**
 * Detail sidebar "Documents" tab — 2-column DocumentCard grid + Upload (shared by patient and appointment detail panels).
 */

import { useState } from "react";
import { Upload } from "lucide-react";
import { DocumentCard } from "@/components/common/DocumentCard";
import { UploadDocumentDialog } from "@/components/common/UploadDocumentDialog";
import type { PatientDocument } from "@/types/patient";

export interface DocumentsTabProps {
  documents: PatientDocument[];
  patientId: string;
  /** When set, new uploads are linked to this appointment as well as the patient. */
  appointmentId?: string;
  /** Empty-state copy when there are no documents. */
  emptyMessage: string;
}

export function DocumentsTab({
  documents,
  patientId,
  appointmentId,
  emptyMessage,
}: DocumentsTabProps) {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--color-text-muted)" }}
        >
          Documents
        </p>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors"
          style={{ background: "var(--color-ink)", color: "var(--color-ink-fg)" }}
        >
          <Upload size={12} aria-hidden />
          Upload
        </button>
      </div>

      {documents.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: "var(--color-text-muted)" }}>
          {emptyMessage}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} className="min-h-[72px]" />
          ))}
        </div>
      )}

      <UploadDocumentDialog
        patientId={patientId}
        appointmentId={appointmentId}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </>
  );
}
