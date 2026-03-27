import { db } from "@/lib/db";
import { clinics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type ActiveClinicRow = {
  id: string;
  name: string;
  subdomain: string;
};

/**
 * Resolve an active clinic by hostname subdomain (DB `subdomain` column).
 * Shared by `middleware.ts`, `GET /api/clinic`, and the login page server component.
 */
export async function getActiveClinicBySubdomain(
  subdomain: string
): Promise<ActiveClinicRow | null> {
  const row = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      subdomain: clinics.subdomain,
      isActive: clinics.isActive,
    })
    .from(clinics)
    .where(eq(clinics.subdomain, subdomain))
    .limit(1);

  if (!row[0] || !row[0].isActive) return null;
  return {
    id: row[0].id,
    name: row[0].name,
    subdomain: row[0].subdomain,
  };
}

/**
 * Resolve an active clinic UUID by hostname subdomain.
 */
export async function getClinicIdBySubdomain(subdomain: string): Promise<string | null> {
  const clinic = await getActiveClinicBySubdomain(subdomain);
  return clinic?.id ?? null;
}
