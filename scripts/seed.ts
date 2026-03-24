/**
 * Provisioning helper for local/staging Neon databases.
 *
 * Usage:
 *   pnpm tsx scripts/seed.ts clinic
 *   pnpm tsx scripts/seed.ts user
 *   pnpm tsx scripts/seed.ts list-clinics
 *   pnpm tsx scripts/seed.ts list-users
 *
 * Loads `.env.local` by default. Override the DB for a one-off run, e.g.:
 *   DATABASE_URL="postgresql://..." pnpm tsx scripts/seed.ts list-clinics
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

// =============================================================================
// SEED CONFIG — edit values below before each run
// =============================================================================

/** New clinic row (used by `clinic` command) */
const CLINIC_SEED = {
  name: "Demo Clinic",
  subdomain: "demo-clinic",
  licenseNumber: "",
  address: "",
  phone: "",
  email: "",
} as const;

/** New user — set `clinicId` OR `clinicSubdomain` (not both empty) */
const USER_SEED = {
  /** Paste a UUID from `list-clinics`, or leave empty and use clinicSubdomain */
  clinicId: "",
  /** Resolve clinic when clinicId is empty (must match `clinics.subdomain`) */
  clinicSubdomain: "demo-clinic",
  email: "admin@demo-clinic.com",
  password: "Admin@12345",
  /** Better-Auth `name` field (required) */
  displayName: "Demo Admin",
  firstName: "Demo",
  lastName: "Admin",
  phone: "",
  type: "admin" as "admin" | "doctor" | "staff",
  /** Chart ID — unique per clinic */
  chartId: 1001,
};
// =============================================================================

import { and, asc, eq } from "drizzle-orm";
import type { DB } from "../lib/db/index";
import { clinics as clinicsTable } from "../lib/db/schema/clinics";

function die(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function uuidOk(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

async function resolveClinicId(db: DB): Promise<string> {
  const rawId = USER_SEED.clinicId.trim();
  const sub = USER_SEED.clinicSubdomain.trim();

  if (rawId) {
    if (!uuidOk(rawId)) {
      die(
        `USER_SEED.clinicId "${rawId}" is not a valid UUID. Run list-clinics and paste the id column.`
      );
    }
    const row = await db
      .select({ id: clinicsTable.id })
      .from(clinicsTable)
      .where(eq(clinicsTable.id, rawId))
      .limit(1);
    if (!row[0]) {
      die(`No clinic found for USER_SEED.clinicId="${rawId}". Run list-clinics first.`);
    }
    return row[0].id;
  }

  if (!sub) {
    die(
      "USER_SEED: set clinicId (UUID from list-clinics) or clinicSubdomain — both are empty."
    );
  }

  const row = await db
    .select({ id: clinicsTable.id })
    .from(clinicsTable)
    .where(eq(clinicsTable.subdomain, sub))
    .limit(1);
  if (!row[0]) {
    die(
      `No clinic with subdomain "${sub}". Create the clinic first (pnpm tsx scripts/seed.ts clinic) or fix clinicSubdomain.`
    );
  }
  console.log(`→ Resolved clinic from subdomain "${sub}" → ${row[0].id}`);
  return row[0].id;
}

async function seedClinic() {
  const { db } = await import("../lib/db/index");
  const { clinics } = await import("../lib/db/schema/clinics");

  const subdomain = CLINIC_SEED.subdomain.trim();
  if (!subdomain) {
    die("CLINIC_SEED.subdomain is required.");
  }

  const existing = await db
    .select({ id: clinics.id })
    .from(clinics)
    .where(eq(clinics.subdomain, subdomain))
    .limit(1);
  if (existing[0]) {
    die(
      `Subdomain "${subdomain}" already exists (clinic id ${existing[0].id}). Pick another name or use list-clinics.`
    );
  }

  const [inserted] = await db
    .insert(clinics)
    .values({
      name: CLINIC_SEED.name.trim() || "Unnamed clinic",
      subdomain,
      licenseNumber: CLINIC_SEED.licenseNumber.trim() || null,
      address: CLINIC_SEED.address.trim() || null,
      phone: CLINIC_SEED.phone.trim() || null,
      email: CLINIC_SEED.email.trim() || null,
    })
    .returning({
      id: clinics.id,
      name: clinics.name,
      subdomain: clinics.subdomain,
    });

  console.log("\n✓ Clinic created");
  console.log(`  id:        ${inserted.id}`);
  console.log(`  name:      ${inserted.name}`);
  console.log(`  subdomain: ${inserted.subdomain}`);
  console.log(
    "\n→ For USER_SEED, set clinicId to this id or set clinicSubdomain to this subdomain before running the user command.\n"
  );
}

async function seedUser() {
  const { db } = await import("../lib/db/index");
  const { auth } = await import("../lib/auth/index");
  const { users } = await import("../lib/db/schema/auth");

  if (!USER_SEED.email.trim() || !USER_SEED.password) {
    die("USER_SEED.email and USER_SEED.password are required.");
  }
  if (!USER_SEED.displayName.trim()) {
    die("USER_SEED.displayName is required (Better-Auth name field).");
  }

  const clinicId = await resolveClinicId(db);

  const emailLower = USER_SEED.email.trim().toLowerCase();

  const emailTaken = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, emailLower))
    .limit(1);
  if (emailTaken[0]) {
    die(
      `Email "${emailLower}" is already registered (user id ${emailTaken[0].id}). Use another email or delete the user row first.`
    );
  }

  const chartConflict = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.clinicId, clinicId), eq(users.chartId, USER_SEED.chartId)))
    .limit(1);
  if (chartConflict[0]) {
    die(
      `chartId ${USER_SEED.chartId} is already used in this clinic (user ${chartConflict[0].id}). Change USER_SEED.chartId.`
    );
  }

  console.log(`→ Signing up via Better-Auth sign-up/email (password hashing + accounts row)…`);

  let signUpResult: unknown;
  try {
    signUpResult = await auth.api.signUpEmail({
      body: {
        name: USER_SEED.displayName.trim(),
        email: emailLower,
        password: USER_SEED.password,
      },
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "message" in err &&
      typeof (err as { message: unknown }).message === "string"
    ) {
      die(`Better-Auth sign-up failed: ${(err as { message: string }).message}`);
    }
    throw err;
  }

  const userId = extractUserId(signUpResult);
  if (!userId) {
    console.error("Unexpected sign-up response:", signUpResult);
    die("Could not read user id from sign-up response.");
  }

  console.log(`→ Better-Auth created user id ${userId}`);

  await db
    .update(users)
    .set({
      clinicId,
      firstName: USER_SEED.firstName.trim() || null,
      lastName: USER_SEED.lastName.trim() || null,
      phone: USER_SEED.phone.trim() || null,
      type: USER_SEED.type,
      chartId: USER_SEED.chartId,
      name: `${USER_SEED.firstName.trim()} ${USER_SEED.lastName.trim()}`.trim() || USER_SEED.displayName.trim(),
    })
    .where(eq(users.id, userId));

  console.log("\n✓ User provisioned");
  console.log(`  id:        ${userId}`);
  console.log(`  email:     ${emailLower}`);
  console.log(`  clinicId:  ${clinicId}`);
  console.log(`  type:      ${USER_SEED.type}`);
  console.log(`  chartId:   ${USER_SEED.chartId}`);
  console.log("");
}

function extractUserId(signUpResult: unknown): string | null {
  if (!signUpResult || typeof signUpResult !== "object") return null;
  const r = signUpResult as Record<string, unknown>;
  if (typeof r.user === "object" && r.user !== null) {
    const u = r.user as Record<string, unknown>;
    if (typeof u.id === "string") return u.id;
  }
  return null;
}

async function listClinics() {
  const { db } = await import("../lib/db/index");
  const { clinics } = await import("../lib/db/schema/clinics");

  const rows = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      subdomain: clinics.subdomain,
      isActive: clinics.isActive,
    })
    .from(clinics)
    .orderBy(asc(clinics.subdomain));

  console.log(
    `\nclinics (${rows.length} row${rows.length === 1 ? "" : "s"})\n${"=".repeat(72)}`
  );
  if (rows.length === 0) {
    console.log("(none)\n");
    return;
  }
  for (const r of rows) {
    console.log(
      `  ${r.subdomain.padEnd(30)}${r.name.padEnd(24)}${r.isActive ? "active" : "inactive"}`
    );
    console.log(`    id: ${r.id}`);
  }
  console.log("");
}

async function listUsers() {
  const { db } = await import("../lib/db/index");
  const { users } = await import("../lib/db/schema/auth");
  const { clinics } = await import("../lib/db/schema/clinics");

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      type: users.type,
      chartId: users.chartId,
      clinicId: users.clinicId,
      clinicName: clinics.name,
      subdomain: clinics.subdomain,
    })
    .from(users)
    .leftJoin(clinics, eq(users.clinicId, clinics.id))
    .orderBy(asc(users.email));

  console.log(
    `\nusers (${rows.length} row${rows.length === 1 ? "" : "s"})\n${"=".repeat(72)}`
  );
  if (rows.length === 0) {
    console.log("(none)\n");
    return;
  }
  for (const r of rows) {
    const tenant = r.subdomain
      ? `${r.subdomain} (${r.clinicName ?? "?"})`
      : r.clinicId
        ? `clinic ${r.clinicId}`
        : "(no clinic)";
    console.log(`  ${r.email}`);
    console.log(
      `    id=${r.id}  type=${r.type}  chartId=${r.chartId ?? "—"}  ${tenant}`
    );
  }
  console.log("");
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    die("DATABASE_URL is not set. Check .env.local or pass DATABASE_URL=... for Neon.");
  }
  if (!process.env.BETTER_AUTH_SECRET?.trim()) {
    die("BETTER_AUTH_SECRET is not set (required for Better-Auth).");
  }

  const cmd = process.argv[2];
  const { pool } = await import("../lib/db/index");

  try {
    switch (cmd) {
      case "clinic":
        await seedClinic();
        break;
      case "user":
        await seedUser();
        break;
      case "list-clinics":
        await listClinics();
        break;
      case "list-users":
        await listUsers();
        break;
      default:
        die(
          `Unknown command ${JSON.stringify(cmd)}.\n` +
            `Use: clinic | user | list-clinics | list-users`
        );
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
