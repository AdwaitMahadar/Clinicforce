import { type AppSession } from "./session";

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requireRole(
  session: AppSession,
  allowed: Array<"admin" | "doctor" | "staff">
): void {
  if (!allowed.includes(session.user.type)) {
    throw new ForbiddenError();
  }
}
