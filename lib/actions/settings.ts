"use server";

/**
 * Settings server actions — tab slices, clinic appearance, user theme.
 * `lib/validators/settings.ts` — Zod; `lib/permissions` — server-side role gates.
 */

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSession } from "@/lib/auth/session";
import { ForbiddenError, requireRole } from "@/lib/auth/rbac";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { clinics, users } from "@/lib/db/schema";
import { s3Client, S3_BUCKET_NAME } from "@/lib/storage/s3-client";
import { buildClinicLogoObjectKey } from "@/lib/storage/clinic-logo-object-key";
import {
  getClinicLogoUploadPresignedUrlSchema,
  updateClinicSettingsColorsSchema,
  userThemeSchema,
} from "@/lib/validators/settings";
import type { SettingsPlaceholderTabData } from "@/types/settings";
import type { ClinicSettingsJson, UserPreferencesJson } from "@/types/clinic-settings";

// ── cache revalidation (RSC + layout) ─────────────────────────────────────────

function revalidateAppShell() {
  revalidatePath("/home/dashboard");
  revalidatePath("/settings");
  revalidatePath("/appointments/dashboard");
  revalidatePath("/patients/dashboard");
  revalidatePath("/medicines/dashboard");
  revalidatePath("/", "layout");
}

// ── Tab slice placeholders (ParallelTabDataPrefetch) ─────────────────────────

export async function getSettingsDetailTemplatesTab(): Promise<
  { success: true; data: SettingsPlaceholderTabData } | { success: false; error: string }
> {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);
    return {
      success: true,
      data: {
        title: "Templates",
        subtitle: "Prescription and document templates will appear here.",
      },
    };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { success: false, error: "FORBIDDEN" };
    }
    console.error("[getSettingsDetailTemplatesTab]", err);
    return { success: false, error: "Failed to load templates tab." };
  }
}

export async function getSettingsDetailIntegrationsTab(): Promise<
  { success: true; data: SettingsPlaceholderTabData } | { success: false; error: string }
> {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);
    return {
      success: true,
      data: {
        title: "Integrations",
        subtitle: "Third-party integrations will appear here.",
      },
    };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { success: false, error: "FORBIDDEN" };
    }
    console.error("[getSettingsDetailIntegrationsTab]", err);
    return { success: false, error: "Failed to load integrations tab." };
  }
}

// ── User theme (all roles) ─────────────────────────────────────────────────

export async function updateUserTheme(input: unknown) {
  try {
    const session = await getSession();
    requireRole(session, ["admin", "doctor", "staff"]);
    const parsed = userThemeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }
    const { theme } = parsed.data;
    const [row] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(and(eq(users.id, session.user.id), eq(users.clinicId, session.user.clinicId)))
      .limit(1);
    if (!row) {
      return { success: false as const, error: "User not found." };
    }
    const next: UserPreferencesJson = { ...row.preferences, theme };
    await db
      .update(users)
      .set({ preferences: next, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));
    revalidateAppShell();
    return { success: true as const, data: { theme } };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { success: false as const, error: "FORBIDDEN" };
    }
    console.error("[updateUserTheme]", err);
    return { success: false as const, error: "Failed to update theme." };
  }
}

// ── Clinic colors (admin + doctor) ──────────────────────────────────────────

export async function updateClinicSettingsColors(input: unknown) {
  try {
    const session = await getSession();
    if (!hasPermission(session.user.type, "editClinicThemeColors")) {
      throw new ForbiddenError();
    }
    const parsed = updateClinicSettingsColorsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }
    const [row] = await db
      .select({ settings: clinics.settings })
      .from(clinics)
      .where(eq(clinics.id, session.user.clinicId))
      .limit(1);
    if (!row) {
      return { success: false as const, error: "Clinic not found." };
    }
    const current = row.settings;
    const next: ClinicSettingsJson = {
      ...current,
      ...(parsed.data.primaryColor !== undefined
        ? { primaryColor: parsed.data.primaryColor }
        : {}),
      ...(parsed.data.secondaryColor !== undefined
        ? { secondaryColor: parsed.data.secondaryColor }
        : {}),
    };
    await db
      .update(clinics)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(clinics.id, session.user.clinicId));
    revalidateAppShell();
    return { success: true as const, data: { settings: next } };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { success: false as const, error: "You do not have permission to change colors." };
    }
    console.error("[updateClinicSettingsColors]", err);
    return { success: false as const, error: "Failed to update colors." };
  }
}

/** Set active colors to the clinic’s stored default* fields. */
export async function resetClinicColorsToDefault() {
  try {
    const session = await getSession();
    if (!hasPermission(session.user.type, "editClinicThemeColors")) {
      throw new ForbiddenError();
    }
    const [row] = await db
      .select({ settings: clinics.settings })
      .from(clinics)
      .where(eq(clinics.id, session.user.clinicId))
      .limit(1);
    if (!row) {
      return { success: false as const, error: "Clinic not found." };
    }
    const s = row.settings;
    const next: ClinicSettingsJson = {
      ...s,
      primaryColor: s.defaultPrimaryColor,
      secondaryColor: s.defaultSecondaryColor,
    };
    await db
      .update(clinics)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(clinics.id, session.user.clinicId));
    revalidateAppShell();
    return { success: true as const, data: { settings: next } };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { success: false as const, error: "You do not have permission." };
    }
    console.error("[resetClinicColorsToDefault]", err);
    return { success: false as const, error: "Failed to reset colors." };
  }
}

/** Copy current primary/secondary into default* (new baseline). Admin only. */
export async function setClinicThemeColorDefaults() {
  try {
    const session = await getSession();
    if (!hasPermission(session.user.type, "setClinicThemeDefaults")) {
      throw new ForbiddenError();
    }
    const [row] = await db
      .select({ settings: clinics.settings })
      .from(clinics)
      .where(eq(clinics.id, session.user.clinicId))
      .limit(1);
    if (!row) {
      return { success: false as const, error: "Clinic not found." };
    }
    const s = row.settings;
    const next: ClinicSettingsJson = {
      ...s,
      defaultPrimaryColor: s.primaryColor,
      defaultSecondaryColor: s.secondaryColor,
    };
    await db
      .update(clinics)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(clinics.id, session.user.clinicId));
    revalidateAppShell();
    return { success: true as const, data: { settings: next } };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { success: false as const, error: "You do not have permission." };
    }
    console.error("[setClinicThemeColorDefaults]", err);
    return { success: false as const, error: "Failed to set defaults." };
  }
}

// ── Clinic logo (admin) — same key as `buildClinicLogoPublicUrl` / asset prefix ─

export async function getClinicLogoUploadPresignedUrl(input: unknown) {
  try {
    const session = await getSession();
    if (!hasPermission(session.user.type, "manageClinicLogo")) {
      throw new ForbiddenError();
    }
    const parsed = getClinicLogoUploadPresignedUrlSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input.",
      };
    }
    const fileKey = buildClinicLogoObjectKey(session.user.clinicSubdomain);
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: fileKey,
      ContentType: "image/png",
      ContentLength: parsed.data.fileSize,
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 15 * 60 });
    return { success: true as const, data: { uploadUrl, fileKey } };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { success: false as const, error: "FORBIDDEN" };
    }
    console.error("[getClinicLogoUploadPresignedUrl]", err);
    return { success: false as const, error: "Failed to generate upload URL." };
  }
}

export async function confirmClinicLogoUpload() {
  try {
    const session = await getSession();
    if (!hasPermission(session.user.type, "manageClinicLogo")) {
      throw new ForbiddenError();
    }
    const [row] = await db
      .select({ settings: clinics.settings })
      .from(clinics)
      .where(eq(clinics.id, session.user.clinicId))
      .limit(1);
    if (!row) {
      return { success: false as const, error: "Clinic not found." };
    }
    const logoUpdatedAt = new Date().toISOString();
    const current = row.settings;
    const next: ClinicSettingsJson = {
      ...current,
      logoUpdatedAt,
    };
    await db
      .update(clinics)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(clinics.id, session.user.clinicId));
    revalidateAppShell();
    return { success: true as const, data: { settings: next } };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { success: false as const, error: "FORBIDDEN" };
    }
    console.error("[confirmClinicLogoUpload]", err);
    return { success: false as const, error: "Failed to confirm logo." };
  }
}

export async function deleteClinicLogo() {
  try {
    const session = await getSession();
    if (!hasPermission(session.user.type, "manageClinicLogo")) {
      throw new ForbiddenError();
    }
    const fileKey = buildClinicLogoObjectKey(session.user.clinicSubdomain);
    try {
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: fileKey })
      );
    } catch (s3Err) {
      console.error("[deleteClinicLogo] S3 delete failed:", s3Err);
      return { success: false as const, error: "Failed to remove file from storage." };
    }
    const [row] = await db
      .select({ settings: clinics.settings })
      .from(clinics)
      .where(eq(clinics.id, session.user.clinicId))
      .limit(1);
    if (!row) {
      return { success: false as const, error: "Clinic not found." };
    }
    const next: ClinicSettingsJson = {
      ...row.settings,
      logoUpdatedAt: null,
    };
    await db
      .update(clinics)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(clinics.id, session.user.clinicId));
    revalidateAppShell();
    return { success: true as const, data: {} as const };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { success: false as const, error: "FORBIDDEN" };
    }
    console.error("[deleteClinicLogo]", err);
    return { success: false as const, error: "Failed to remove logo." };
  }
}
