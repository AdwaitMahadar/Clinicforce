import type { ClinicSettingsJson, UserPreferencesJson } from "@/types/clinic-settings";

/**
 * Baseline clinic appearance colors (hex). Aligned with product palette in `app/globals.css`
 * (`--color-green`, `--color-blue`) — used for DB defaults, seed, and migrations.
 */
export const DEFAULT_CLINIC_SETTINGS: ClinicSettingsJson = {
  primaryColor: "#2D9B6F",
  secondaryColor: "#2563EB",
  defaultPrimaryColor: "#2D9B6F",
  defaultSecondaryColor: "#2563EB",
};

export const DEFAULT_USER_PREFERENCES: UserPreferencesJson = {
  theme: "light",
};
