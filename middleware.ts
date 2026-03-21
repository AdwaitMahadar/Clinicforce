import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/clinic", "/_next", "/favicon.ico"];

function extractSubdomain(host: string): string | null {
  // demo-clinic.localhost:3000 → demo-clinic
  // medlife.clinicforce.com   → medlife
  const hostWithoutPort = host.split(":")[0];
  const parts = hostWithoutPort.split(".");
  if (parts.length >= 2 && parts[0] !== "www" && parts[0] !== "localhost") {
    return parts[0];
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const subdomain = extractSubdomain(host);

  // Allow all public paths through without any checks
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // No subdomain — cannot determine which clinic
  if (!subdomain) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Resolve clinicId from subdomain via internal API route
  const clinicRes = await fetch(
    `${request.nextUrl.origin}/api/clinic?subdomain=${subdomain}`,
    { headers: { "x-internal": "1" } }
  );

  if (!clinicRes.ok) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { clinicId } = await clinicRes.json();

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
};
