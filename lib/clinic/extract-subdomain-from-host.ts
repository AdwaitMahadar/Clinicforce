/**
 * Parse tenant subdomain from the raw Host / X-Forwarded-Host value.
 * Must stay in sync with `extractSubdomain` in `middleware.ts` (which forwards this header string).
 */
export function extractSubdomainFromHost(hostHeader: string): string | null {
  const hostWithoutPort = hostHeader.split(":")[0] ?? "";
  if (hostWithoutPort === "clinicforce.app") return null;
  const stripped = hostWithoutPort
    .replace(/\.clinicforce\.app$/, "")
    .replace(/\.localhost$/, "");
  const hostNormalized = hostWithoutPort.replace(/:\d+$/, "");

  if (stripped === hostNormalized) {
    const parts = hostWithoutPort.split(".");
    if (parts.length < 2 || parts[0] === "www" || parts[0] === "localhost") {
      return null;
    }
    return parts[0] ?? null;
  }
  if (!stripped || stripped === "www") return null;
  return stripped;
}
