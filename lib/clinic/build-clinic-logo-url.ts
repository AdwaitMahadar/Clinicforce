import { sanitizeClinicSubdomainForKey } from "@/lib/storage/document-object-key";

/**
 * Public URL for the clinic logo at `{sanitizedSubdomain}/assets/logo/logo.png`.
 * Base URL comes from `ASSETS_BASE_URL` (public CDN / Minio path prefix — not the private S3 API endpoint).
 * When `logoUpdatedAt` is set, appends a cache-buster query (matches `clinics.settings.logoUpdatedAt` after upload).
 */
export function buildClinicLogoPublicUrl(
  clinicSubdomain: string,
  logoUpdatedAt?: string | null
): string {
  const baseUrl = (process.env.ASSETS_BASE_URL ?? "").replace(/\/+$/, "");
  const prefix = sanitizeClinicSubdomainForKey(clinicSubdomain);
  const path = `${baseUrl}/${prefix}/assets/logo/logo.png`;
  if (logoUpdatedAt && logoUpdatedAt.trim()) {
    const v = encodeURIComponent(logoUpdatedAt);
    return `${path}?v=${v}`;
  }
  return path;
}
