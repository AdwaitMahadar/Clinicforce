import { sanitizeClinicSubdomainForKey } from "@/lib/storage/document-object-key";

/** Fixed S3 key for the clinic logo — same for first upload and overwrites. */
export function buildClinicLogoObjectKey(clinicSubdomain: string): string {
  const prefix = sanitizeClinicSubdomainForKey(clinicSubdomain);
  return `${prefix}/assets/logo/logo.png`;
}
