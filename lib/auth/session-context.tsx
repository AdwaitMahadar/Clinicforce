"use client";

import { createContext, useContext } from "react";
import { hasPermission, type Permission, type UserType } from "@/lib/permissions";

/**
 * The subset of AppSession.user that is safe and useful to expose to client
 * components. Deliberately excludes `id`, `clinicId`, and `clinicSubdomain`
 * — those are server-only and must never be sent to the client.
 */
export interface AppSessionUser {
  type: UserType;
  firstName: string;
  lastName: string;
  email: string;
  clinicName: string;
}

interface AppSessionContextValue {
  user: AppSessionUser;
}

const AppSessionContext = createContext<AppSessionContextValue | null>(null);

interface AppSessionProviderProps {
  user: AppSessionUser;
  children: React.ReactNode;
}

/**
 * Wraps the authenticated app tree and makes the current user's role and
 * profile available to all client components via `useAppSession()`.
 *
 * Mount once in `app/(app)/layout.tsx` — the session is already resolved there
 * via `getSession()`, so no additional server round-trips occur.
 */
export function AppSessionProvider({ user, children }: AppSessionProviderProps) {
  return (
    <AppSessionContext.Provider value={{ user }}>
      {children}
    </AppSessionContext.Provider>
  );
}

/**
 * Returns the current user's session info available client-side.
 *
 * Must be called inside the `(app)` layout tree (i.e. anywhere under
 * `app/(app)/`). Throws if called outside the provider.
 */
export function useAppSession(): AppSessionContextValue {
  const ctx = useContext(AppSessionContext);
  if (!ctx) {
    throw new Error(
      "useAppSession must be used within an AppSessionProvider. " +
        "Make sure the component is inside app/(app)/."
    );
  }
  return ctx;
}

/**
 * Returns `true` when the current user holds the given permission.
 *
 * @example
 * const canDelete = usePermission("deletePatient");
 */
export function usePermission(permission: Permission): boolean {
  const { user } = useAppSession();
  return hasPermission(user.type, permission);
}
