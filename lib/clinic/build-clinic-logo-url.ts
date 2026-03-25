import { sanitizeClinicSubdomainForKey } from "@/lib/storage/document-object-key";

/**
 * Public URL for the clinic logo at `{sanitizedSubdomain}/assets/logo/logo.png`
 * (path-style: `{S3_ENDPOINT}/{bucket}/...`). Matches the object key prefix used in storage.
 */
export function buildClinicLogoPublicUrl(clinicSubdomain: string): string {
  const endpoint = (process.env.S3_ENDPOINT ?? "").replace(/\/+$/, "");
  const bucket = process.env.S3_BUCKET_NAME ?? "";
  const prefix = sanitizeClinicSubdomainForKey(clinicSubdomain);
  return `${endpoint}/${bucket}/${prefix}/assets/logo/logo.png`;
}
