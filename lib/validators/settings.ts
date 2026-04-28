import { z } from "zod";

/** 6-digit hex (e.g. `#2D9B6F`) — matches product palette in `app/globals.css`. */
export const clinicColorHexSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use a 6-digit hex color (e.g. #2D9B6F).");

export const updateClinicSettingsColorsSchema = z
  .object({
    primaryColor: clinicColorHexSchema.optional(),
    secondaryColor: clinicColorHexSchema.optional(),
  })
  .refine(
    (v) => v.primaryColor !== undefined || v.secondaryColor !== undefined,
    { message: "At least one of primary or secondary is required." }
  );

export const userThemeSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB (product rule)

export const getClinicLogoUploadPresignedUrlSchema = z.object({
  fileSize: z
    .number()
    .int("File size must be a whole number of bytes.")
    .positive("File size must be positive.")
    .max(MAX_LOGO_BYTES, "Logo must be 2 MB or smaller (PNG)."),
});
