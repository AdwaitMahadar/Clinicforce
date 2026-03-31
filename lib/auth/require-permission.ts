import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import type { AppSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";

/**
 * Server-side permission guard for page and modal-page Server Components.
 *
 * Resolves the current session (via the React-cached `getSession()`), checks
 * whether the user holds `permission` using the central `PERMISSIONS` map, and
 * calls `redirect(redirectTo)` if they do not. Returns the resolved
 * `AppSession` so the caller never needs a second `getSession()` call.
 *
 * Because `getSession()` is wrapped in React `cache()`, any subsequent call
 * within the same request (e.g. inside a server action triggered on the same
 * render) reuses the first result — no extra DB round-trip.
 *
 * @example
 * // Minimal guard — session not needed downstream:
 * await requirePermission("viewMedicines");
 *
 * @example
 * // Guard + session reuse — no second getSession() call needed:
 * const session = await requirePermission("manageUsers");
 * // session.user.clinicId, session.user.type, etc. are available here
 *
 * @param permission  A key from `lib/permissions.ts` PERMISSIONS map.
 * @param redirectTo  Path to redirect unauthorised users (default: "/home/dashboard").
 */
export async function requirePermission(
  permission: Permission,
  redirectTo = "/home/dashboard"
): Promise<AppSession> {
  const session = await getSession();
  if (!hasPermission(session.user.type, permission)) {
    redirect(redirectTo);
  }
  return session;
}
