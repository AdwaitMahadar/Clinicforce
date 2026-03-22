import { db } from "@/lib/db";
import { clinics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Resolve an active clinic UUID by hostname subdomain.
 * Shared by `middleware.ts` (Node runtime) and `GET /api/clinic`.
 */
export async function getClinicIdBySubdomain(subdomain: string): Promise<string | null> {
  const row = await db
    .select({ id: clinics.id, isActive: clinics.isActive })
    .from(clinics)
    .where(eq(clinics.subdomain, subdomain))
    .limit(1);

  if (!row[0] || !row[0].isActive) return null;
  return row[0].id;
}
