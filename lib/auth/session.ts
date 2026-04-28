import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clinics, users } from "@/lib/db/schema";
import type { ClinicSettingsJson, UserPreferencesJson } from "@/types/clinic-settings";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";

export interface AppSession {
  user: {
    id: string;
    clinicId: string;
    /** From `clinics.subdomain` — tenant slug for paths (e.g. S3 keys) without a separate clinic query. */
    clinicSubdomain: string;
    /** From `clinics.name` — safe to pass to the client for sidebar branding. */
    clinicName: string;
    type: "admin" | "doctor" | "staff";
    firstName: string;
    lastName: string;
    email: string;
    /** Per-user UI prefs; not null in DB. */
    preferences: UserPreferencesJson;
    /**
     * Clinic `settings` jsonb (appearance + optional logo cache buster).
     * Exposed to server actions and, via layout, to `ClinicAppearanceProvider` (colors + theme) — never pass `clinicId` to the client.
     */
    clinic: {
      settings: ClinicSettingsJson;
    };
  };
}

export const getSession = cache(async (): Promise<AppSession> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  // Better-Auth session only contains base fields; fetch user + clinic subdomain in one step
  const row = await db
    .select({
      id: users.id,
      clinicId: users.clinicId,
      clinicSubdomain: clinics.subdomain,
      clinicName: clinics.name,
      type: users.type,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      preferences: users.preferences,
      clinicSettings: clinics.settings,
    })
    .from(users)
    .innerJoin(clinics, eq(users.clinicId, clinics.id))
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!row[0]) {
    throw new Error("USER_NOT_FOUND");
  }

  // Validate user belongs to the clinic derived from the request subdomain
  const headersList = await headers();
  const subdomainClinicId = headersList.get("x-clinic-id");

  if (!subdomainClinicId) {
    throw new Error("MISSING_CLINIC_CONTEXT");
  }

  if (row[0].clinicId !== subdomainClinicId) {
    throw new Error("CLINIC_MISMATCH");
  }

  return {
    user: {
      id: row[0].id,
      clinicId: row[0].clinicId!,
      clinicSubdomain: row[0].clinicSubdomain,
      clinicName: row[0].clinicName,
      type: row[0].type as "admin" | "doctor" | "staff",
      firstName: row[0].firstName ?? "",
      lastName: row[0].lastName ?? "",
      email: row[0].email,
      preferences: row[0].preferences,
      clinic: { settings: row[0].clinicSettings },
    },
  };
});
