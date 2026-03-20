import { type AppSession } from "./session";

export function requireRole(
  session: AppSession,
  allowed: Array<"admin" | "doctor" | "staff">
): void {
  // TODO: Implement real role enforcement when RBAC is added.
  void session;
  void allowed;
}
