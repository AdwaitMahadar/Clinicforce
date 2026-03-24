import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { getClinicIdBySubdomain } from "@/lib/clinic/resolve-by-subdomain";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/clinic", "/_next", "/favicon.ico"];

function extractSubdomain(request: NextRequest): string | null {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const hostWithoutPort = host.split(":")[0];
  // Remove known apex domains to isolate the subdomain
  const stripped = hostWithoutPort
    .replace(/\.clinicforce\.app$/, "")
    .replace(/\.localhost$/, "");
  // If nothing was stripped, we're on the bare apex domain — no subdomain
  if (stripped === hostWithoutPort.replace(/:\d+$/, "")) {
    const parts = hostWithoutPort.split(".");
    if (parts.length < 2 || parts[0] === "www" || parts[0] === "localhost") {
      return null;
    }
    return parts[0];
  }
  if (!stripped || stripped === "www") return null;
  return stripped;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const subdomain = extractSubdomain(request);

  // Allow all public paths through without any checks
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  console.log("[middleware] subdomain debug", {
    "x-forwarded-host": request.headers.get("x-forwarded-host"),
    host: request.headers.get("host"),
    subdomain,
  });

  // No subdomain — cannot determine which clinic
  if (!subdomain) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clinicId = await getClinicIdBySubdomain(subdomain);
  if (!clinicId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check for a valid Better-Auth session cookie
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated — if trying to hit /login, bounce to dashboard
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/home/dashboard", request.url));
  }

  // Forward resolved clinicId and subdomain downstream via request headers
  const response = NextResponse.next();
  response.headers.set("x-clinic-id", clinicId);
  response.headers.set("x-subdomain", subdomain);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  runtime: "nodejs",
};
