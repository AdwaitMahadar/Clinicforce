/**
 * JSON shapes stored in `clinics.settings` and `users.preferences`.
 * See `docs/03-Database-Schema.md` and `lib/constants/clinic-settings.ts` for defaults.
 */

export type ClinicSettingsJson = {
  primaryColor: string;
  secondaryColor: string;
  defaultPrimaryColor: string;
  defaultSecondaryColor: string;
  /** ISO timestamp; set when a logo is uploaded (cache buster). */
  logoUpdatedAt?: string | null;
};

export type UserPreferencesJson = {
  theme: "light" | "dark" | "system";
};
