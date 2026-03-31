"use client";

import { usePermission } from "@/lib/auth/session-context";
import type { Permission } from "@/lib/permissions";

interface RoleGateProps {
  /** The permission required to see this content. */
  permission: Permission;
  children: React.ReactNode;
  /**
   * Optional fallback rendered when the user lacks the permission.
   * Defaults to `null` (renders nothing).
   */
  fallback?: React.ReactNode;
}

/**
 * Renders `children` only when the current user holds `permission`.
 * Otherwise renders `fallback` (default: nothing).
 *
 * @example
 * <RoleGate permission="deletePatient">
 *   <DeleteButton />
 * </RoleGate>
 *
 * @example
 * <RoleGate permission="manageUsers" fallback={<p>Admin only</p>}>
 *   <UserManagementPanel />
 * </RoleGate>
 */
export function RoleGate({ permission, children, fallback = null }: RoleGateProps) {
  const allowed = usePermission(permission);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
