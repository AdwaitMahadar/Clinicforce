/**
 * MIME-based file icon (PDF / image / generic) — shared by DocumentCard and UniversalSearch.
 * Colours use CSS variables only.
 */

import { FileText, Image as ImageIcon, File } from "lucide-react";

export interface DocumentMimeTypeIconProps {
  mimeType: string;
  /** Lucide icon size; default 16 to match document list tiles */
  iconSize?: number;
  className?: string;
}

export function DocumentMimeTypeIcon({
  mimeType,
  iconSize = 16,
  className = "",
}: DocumentMimeTypeIconProps) {
  const mt = mimeType.trim();
  const isPdf = mt === "application/pdf";
  const isImage = mt.startsWith("image/");

  if (isPdf) {
    return (
      <div
        className={`p-1.5 rounded-md shrink-0 ${className}`}
        style={{ background: "var(--color-red-bg)", color: "var(--color-red)" }}
      >
        <FileText size={iconSize} aria-hidden />
      </div>
    );
  }
  if (isImage) {
    return (
      <div
        className={`p-1.5 rounded-md shrink-0 ${className}`}
        style={{ background: "var(--color-blue-bg)", color: "var(--color-blue)" }}
      >
        <ImageIcon size={iconSize} aria-hidden />
      </div>
    );
  }
  return (
    <div
      className={`p-1.5 rounded-md shrink-0 ${className}`}
      style={{
        background: "var(--color-surface-alt)",
        color: "var(--color-text-muted)",
        border: "1px solid var(--color-border)",
      }}
    >
      <File size={iconSize} aria-hidden />
    </div>
  );
}
