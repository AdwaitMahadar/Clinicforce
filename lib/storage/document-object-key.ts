/**
 * Object key layout (docs/09-File-Upload-Flow.md §7):
 * `{clinicSubdomain}/{assignedToType}/{assignedToId}/{uuid}-{sanitised-filename}`
 */

export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.slice(0, 200) || "file";
}

/** Normalise clinic subdomain for use as the first path segment (S3-safe). */
export function sanitizeClinicSubdomainForKey(subdomain: string): string {
  const s = subdomain
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "clinic";
}

export function buildDocumentObjectKey(params: {
  clinicSubdomain: string;
  assignedToType: "patient" | "user";
  assignedToId: string;
  originalFileName: string;
}): string {
  const prefix = sanitizeClinicSubdomainForKey(params.clinicSubdomain);
  const safe = sanitizeFileName(params.originalFileName);
  return `${prefix}/${params.assignedToType}/${params.assignedToId}/${crypto.randomUUID()}-${safe}`;
}
