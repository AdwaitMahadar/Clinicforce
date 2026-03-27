import { headers } from "next/headers";
import { extractSubdomainFromHost } from "@/lib/clinic/extract-subdomain-from-host";
import { getActiveClinicBySubdomain } from "@/lib/clinic/resolve-by-subdomain";
import { buildClinicLogoPublicUrl } from "@/lib/clinic/build-clinic-logo-url";
import { LoginPageClient } from "./login-page-client";

export default async function LoginPage() {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const subdomain = extractSubdomainFromHost(host);

  let clinicBrand: { name: string; logoUrl: string } | null = null;
  if (subdomain) {
    const clinic = await getActiveClinicBySubdomain(subdomain);
    if (clinic) {
      clinicBrand = {
        name: clinic.name,
        logoUrl: buildClinicLogoPublicUrl(clinic.subdomain),
      };
    }
  }

  return <LoginPageClient clinicBrand={clinicBrand} />;
}
