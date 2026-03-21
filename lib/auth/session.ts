import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export interface AppSession {
  user: {
    id: string;
    clinicId: string;
    type: "admin" | "doctor" | "staff";
    firstName: string;
    lastName: string;
    email: string;
  };
}

export async function getSession(): Promise<AppSession> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  // Better-Auth session only contains base fields; fetch extended user fields
  const dbUser = await db
    .select({
      id: users.id,
      clinicId: users.clinicId,
      type: users.type,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!dbUser[0]) {
    throw new Error("USER_NOT_FOUND");
  }

  // Validate user belongs to the clinic derived from the request subdomain
  const headersList = await headers();
  const subdomainClinicId = headersList.get("x-clinic-id");

  if (subdomainClinicId && dbUser[0].clinicId !== subdomainClinicId) {
    throw new Error("CLINIC_MISMATCH");
  }

  return {
    user: {
      id: dbUser[0].id,
      clinicId: dbUser[0].clinicId!,
      type: dbUser[0].type as "admin" | "doctor" | "staff",
      firstName: dbUser[0].firstName ?? "",
      lastName: dbUser[0].lastName ?? "",
      email: dbUser[0].email,
    },
  };
}
