"use client";

/**
 * Document list tile — opens a presigned GET URL in a new tab on click.
 */

import { useCallback, useState } from "react";
import { FileText, Image as ImageIcon, File } from "lucide-react";
import { isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { getViewPresignedUrl } from "@/lib/actions/documents";
import type { PatientDocument } from "@/types/patient";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatRelativeUploaded(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return formatDistanceToNow(d, { addSuffix: true });
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  if (isPdf) {
    return (
      <div
        className="p-1.5 rounded-md flex-shrink-0"
        style={{ background: "var(--color-red-bg)", color: "var(--color-red)" }}
      >
        <FileText size={16} aria-hidden />
      </div>
    );
  }
  if (isImage) {
    return (
      <div
        className="p-1.5 rounded-md flex-shrink-0"
        style={{ background: "var(--color-blue-bg)", color: "var(--color-blue)" }}
      >
        <ImageIcon size={16} aria-hidden />
      </div>
    );
  }
  return (
    <div
      className="p-1.5 rounded-md flex-shrink-0"
      style={{
        background: "var(--color-surface-alt)",
        color: "var(--color-text-muted)",
        border: "1px solid var(--color-border)",
      }}
    >
      <File size={16} aria-hidden />
    </div>
  );
}

export interface DocumentCardProps {
  document: PatientDocument;
  className?: string;
}

export function DocumentCard({ document: doc, className = "" }: DocumentCardProps) {
  const [busy, setBusy] = useState(false);
  const displayTitle = doc.title?.trim() || doc.fileName;

  const handleOpen = useCallback(async () => {
    setBusy(true);
    try {
      const res = await getViewPresignedUrl(doc.id);
      if (!res.success) {
        toast.error(res.error ?? "Could not open document.");
        return;
      }
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not open document.");
    } finally {
      setBusy(false);
    }
  }, [doc.id]);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleOpen}
      className={`flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition-colors disabled:opacity-60 ${className}`}
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface-alt)",
        cursor: busy ? "wait" : "pointer",
      }}
    >
      <FileTypeIcon mimeType={doc.mimeType} />
      <div className="min-w-0 flex-1">
        <p
          className="text-xs font-medium truncate"
          style={{ color: "var(--color-text-primary)" }}
        >
          {displayTitle}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {formatFileSize(doc.fileSize)} · {formatRelativeUploaded(doc.uploadedAt)}
        </p>
      </div>
    </button>
  );
}
