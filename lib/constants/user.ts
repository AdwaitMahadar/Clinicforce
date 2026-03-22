/**
 * User type values — aligned with `user_type` enum in `lib/db/schema/auth.ts`.
 * Use for display labels in the shell; RBAC continues to use string literals in `lib/auth/rbac.ts`.
 */

export const USER_TYPES = ["admin", "doctor", "staff"] as const;

export type UserType = (typeof USER_TYPES)[number];

/** Human-readable labels for sidebar and similar UI. */
export const USER_TYPE_LABELS: Record<UserType, string> = {
  admin:  "Administrator",
  doctor: "Doctor",
  staff:  "Staff",
};
