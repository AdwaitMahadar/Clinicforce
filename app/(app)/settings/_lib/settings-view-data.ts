import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { ForbiddenError, requireRole } from "@/lib/auth/rbac";
import { buildClinicLogoPublicUrl } from "@/lib/clinic/build-clinic-logo-url";
import { db } from "@/lib/db";
import { clinics, users } from "@/lib/db/schema";
import type { SettingsViewPayload } from "@/types/settings";

/**
 * Blocking data for `/settings` (General tab shell). Tab loaders + prefetch use
 * `lib/detail-tab-fetch-cache.ts` for Templates / Integrations placeholders.
 */
export async function loadSettingsViewData(): Promise<SettingsViewPayload | null> {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);

    const row = await db
      .select({
        settings: clinics.settings,
        preferences: users.preferences,
      })
      .from(users)
      .innerJoin(clinics, eq(users.clinicId, clinics.id))
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!row[0]) return null;

    const settings = row[0].settings;
    return {
      clinicId: session.user.clinicId,
      clinicName: session.user.clinicName,
      clinicLogoUrl: buildClinicLogoPublicUrl(
        session.user.clinicSubdomain,
        settings.logoUpdatedAt
      ),
      userType: session.user.type,
      settings,
      preferences: row[0].preferences,
    };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return null;
    }
    console.error("[loadSettingsViewData]", err);
    return null;
  }
}
