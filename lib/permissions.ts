/**
 * Permission map — the single source of truth for all role-based UI decisions.
 *
 * Each key is a named capability. The value is the list of user types that hold
 * that capability. Use `hasPermission` / `usePermission` / `<RoleGate>` to
 * consume this map. Never duplicate role checks inline in components.
 *
 * Server actions must still call `requireRole()` from `lib/auth/rbac.ts`
 * independently — UI gating here is for UX only.
 */

export type UserType = "admin" | "doctor" | "staff";

export const PERMISSIONS = {
  // ── Users ────────────────────────────────────────────────────────────────
  /** Create, read, update, or deactivate user accounts. Admin only. */
  manageUsers: ["admin"],

  // ── Patients ─────────────────────────────────────────────────────────────
  viewPatients: ["admin", "doctor", "staff"],
  createPatient: ["admin", "doctor", "staff"],
  editPatient: ["admin", "doctor", "staff"],
  /** Permanently delete / hard-deactivate a patient record. */
  deletePatient: ["admin", "doctor"],

  // ── Clinical notes (nested under patient/appointment detail) ─────────────
  /** View the clinical notes field on patient and appointment records. */
  viewClinicalNotes: ["admin", "doctor"],
  editClinicalNotes: ["admin", "doctor"],

  // ── Detail sidebar ────────────────────────────────────────────────────────
  /**
   * Show the right-column sidebar in detail views (tabs + activity log).
   * Staff sees a full-width form only — same layout as create/add mode.
   */
  viewDetailSidebar: ["admin", "doctor"],

  // ── Appointments ─────────────────────────────────────────────────────────
  viewAppointments: ["admin", "doctor", "staff"],
  createAppointment: ["admin", "doctor", "staff"],
  editAppointment: ["admin", "doctor", "staff"],
  deleteAppointment: ["admin", "doctor", "staff"],

  // ── Documents ────────────────────────────────────────────────────────────
  viewDocuments: ["admin", "doctor", "staff"],
  uploadDocument: ["admin", "doctor", "staff"],
  editDocument: ["admin", "doctor"],
  deleteDocument: ["admin", "doctor"],

  // ── Medicines ────────────────────────────────────────────────────────────
  viewMedicines: ["admin", "doctor"],
  createMedicine: ["admin", "doctor"],
  editMedicine: ["admin", "doctor"],
  deleteMedicine: ["admin", "doctor"],
} as const satisfies Record<string, ReadonlyArray<UserType>>;

/** All named permissions in the system. */
export type Permission = keyof typeof PERMISSIONS;

/**
 * Returns `true` when `role` is listed for `permission` in the PERMISSIONS map.
 *
 * @example
 * hasPermission("staff", "deletePatient") // false
 * hasPermission("admin", "deletePatient") // true
 */
export function hasPermission(role: UserType, permission: Permission): boolean {
  return (PERMISSIONS[permission] as ReadonlyArray<UserType>).includes(role);
}
