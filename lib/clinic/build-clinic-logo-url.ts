import { sanitizeClinicSubdomainForKey } from "@/lib/storage/document-object-key";

/**
 * Public URL for the clinic logo at `{sanitizedSubdomain}/assets/logo/logo.png`.
 * Base URL comes from `ASSETS_BASE_URL` (public CDN / Minio path prefix — not the private S3 API endpoint).
 */
export function buildClinicLogoPublicUrl(clinicSubdomain: string): string {
  const baseUrl = (process.env.ASSETS_BASE_URL ?? "").replace(/\/+$/, "");
  const prefix = sanitizeClinicSubdomainForKey(clinicSubdomain);
  return `${baseUrl}/${prefix}/assets/logo/logo.png`;
}
