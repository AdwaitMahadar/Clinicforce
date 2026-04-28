import type { ClinicSettingsJson, UserPreferencesJson } from "./clinic-settings";

/** Blocking payload for the Settings General tab (from `loadSettingsViewData`). */
export type SettingsViewPayload = {
  clinicId: string;
  /** Display name for logo fallback (`ClinicBrandMark`). */
  clinicName: string;
  /** Public asset URL for sidebar-style logo preview (`buildClinicLogoPublicUrl`). */
  clinicLogoUrl: string;
  userType: "admin" | "doctor" | "staff";
  settings: ClinicSettingsJson;
  preferences: UserPreferencesJson;
};

/** Placeholder tab bodies until Templates / Integrations are implemented. */
export type SettingsPlaceholderTabData = {
  title: string;
  subtitle: string;
};
