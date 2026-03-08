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
  // TODO: Replace with real Better Auth session when auth is implemented
  return {
    user: {
      id: "yn5d3vkdpzxzmare7bac8baj",
      clinicId: "3ba05aa6-b010-44a5-a556-dcc793c49792",
      type: "admin" as const,
      firstName: "Dev",
      lastName: "User",
      email: "dev@clinicforce.com",
    },
  };
}
