import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { extractSubdomainFromHost } from "@/lib/clinic/extract-subdomain-from-host";
import { getClinicIdBySubdomain } from "@/lib/clinic/resolve-by-subdomain";

const subdomainCache = new Map<string, string>();
const CACHE_MAX = 500;

const PUBLIC_PATHS = [
  "/login",
  "/clinic-not-found",
  "/api/auth",
  "/api/clinic",
  "/_next",
  "/favicon.ico",
];

function extractSubdomain(request: NextRequest): string | null {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  return extractSubdomainFromHost(host);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const subdomain = extractSubdomain(request);

  // Allow all public paths through without any checks
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // No subdomain — cannot determine which clinic
  if (!subdomain) {
    return NextResponse.next();
  }

  let clinicId = subdomainCache.get(subdomain) ?? null;
  if (!clinicId) {
    clinicId = await getClinicIdBySubdomain(subdomain);
    if (clinicId) {
      if (subdomainCache.size >= CACHE_MAX) {
        subdomainCache.delete(subdomainCache.keys().next().value!);
      }
      subdomainCache.set(subdomain, clinicId);
    }
  }
  if (!clinicId) {
    return NextResponse.redirect(new URL("/clinic-not-found", request.url));
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf|css|js)$).*)",
  ],
  runtime: "nodejs",
};
