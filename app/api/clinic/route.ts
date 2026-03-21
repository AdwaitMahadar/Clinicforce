import { db } from "@/lib/db";
import { clinics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get("subdomain");
  if (!subdomain) return NextResponse.json(null, { status: 400 });

  const clinic = await db
    .select({ id: clinics.id, isActive: clinics.isActive })
    .from(clinics)
    .where(eq(clinics.subdomain, subdomain))
    .limit(1);

  if (!clinic[0] || !clinic[0].isActive) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json({ clinicId: clinic[0].id });
}
