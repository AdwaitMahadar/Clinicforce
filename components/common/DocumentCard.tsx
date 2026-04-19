"use client";

/**
 * Document list tile — opens a presigned GET URL in a new tab on click.
 * Admin/doctor: top-right inline delete (circle → red pill) via `deleteDocument`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteDocument, getViewPresignedUrl } from "@/lib/actions/documents";
import type { PatientDocument } from "@/types/patient";
import { DocumentMimeTypeIcon } from "@/components/common/DocumentMimeTypeIcon";
import { usePermission } from "@/lib/auth/session-context";
import {
  documentDeleteLabelOpacity,
  documentDeletePillWidth,
} from "@/components/layout/nav-motion";

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

export interface DocumentCardProps {
  document: PatientDocument;
  className?: string;
}

export function DocumentCard({ document: doc, className = "" }: DocumentCardProps) {
  const canDelete = usePermission("uploadDocument");
  const [busy, setBusy] = useState(false);
  const [deleteExpanded, setDeleteExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removed, setRemoved] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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

  const handleMainClick = useCallback(() => {
    if (deleting) return;
    if (deleteExpanded) {
      setDeleteExpanded(false);
      return;
    }
    void handleOpen();
  }, [deleting, deleteExpanded, handleOpen]);

  const handleConfirmDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await deleteDocument(doc.id);
      if (res.success) {
        toast.success("Document deleted.");
        setRemoved(true);
      } else {
        const msg =
          res.error === "FORBIDDEN"
            ? "You don't have permission to delete documents."
            : (res.error ?? "Failed to delete document.");
        toast.error(msg);
        setDeleteExpanded(false);
      }
    } catch {
      toast.error("Failed to delete document.");
      setDeleteExpanded(false);
    } finally {
      setDeleting(false);
    }
  }, [doc.id]);

  useEffect(() => {
    if (!deleteExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        e.stopPropagation();
        setDeleteExpanded(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteExpanded, deleting]);

  useEffect(() => {
    if (!deleteExpanded || deleting) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = cardRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setDeleteExpanded(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [deleteExpanded, deleting]);

  if (removed) return null;

  return (
    <div
      ref={cardRef}
      className={`relative flex w-full items-start gap-2 overflow-visible rounded-lg border p-2.5 text-left ${className}`}
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      <button
        type="button"
        disabled={(!deleteExpanded && busy) || deleting}
        onClick={handleMainClick}
        className={`flex min-w-0 flex-1 items-start gap-2 text-left transition-colors disabled:opacity-60 ${canDelete ? "pr-9" : ""}`}
        style={{
          cursor: deleting ? "wait" : busy && !deleteExpanded ? "wait" : "pointer",
        }}
      >
        <DocumentMimeTypeIcon mimeType={doc.mimeType} />
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

      {canDelete && (
        <div
          className="absolute z-10 -top-2.5 -right-2.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <motion.div
            className="flex h-[22px] overflow-hidden rounded-full"
            style={{
              border: deleteExpanded ? "none" : "1px solid var(--color-border)",
              background: deleteExpanded ? "var(--color-red)" : "var(--color-surface)",
            }}
            initial={{ width: 22 }}
            animate={{ width: deleteExpanded ? 60 : 22 }}
            transition={documentDeletePillWidth}
          >
            <AnimatePresence initial={false}>
              {!deleteExpanded ? (
                <motion.button
                  key="x"
                  type="button"
                  className="flex size-[22px] items-center justify-center shrink-0"
                  style={{ color: "var(--color-text-secondary)", lineHeight: 0 }}
                  aria-label="Delete document"
                  exit={{ opacity: 0 }}
                  transition={{ opacity: documentDeleteLabelOpacity }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteExpanded(true);
                  }}
                >
                  <X
                    className="m-0 size-3.5 shrink-0"
                    strokeWidth={2}
                    aria-hidden
                    style={{ transform: "translate(-0.5px, -0.5px)" }}
                  />
                </motion.button>
              ) : (
                <motion.button
                  key="delete"
                  type="button"
                  className="box-border m-0 flex h-[22px] items-center px-2.5 text-xs font-semibold whitespace-nowrap disabled:cursor-not-allowed"
                  style={{ color: "var(--color-ink-fg)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ opacity: documentDeleteLabelOpacity }}
                  disabled={deleting}
                  aria-busy={deleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!deleting) void handleConfirmDelete();
                  }}
                >
                  {deleting ? (
                    <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    "Delete"
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </div>
  );
}
