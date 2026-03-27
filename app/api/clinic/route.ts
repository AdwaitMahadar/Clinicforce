import { getActiveClinicBySubdomain } from "@/lib/clinic/resolve-by-subdomain";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get("subdomain");
  if (!subdomain) return NextResponse.json(null, { status: 400 });

  const clinic = await getActiveClinicBySubdomain(subdomain);
  if (!clinic) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json({ clinicId: clinic.id, name: clinic.name });
}
