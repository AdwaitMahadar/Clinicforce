import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { DEFAULT_CLINIC_SETTINGS } from "@/lib/constants/clinic-settings";
import type { ClinicSettingsJson } from "@/types/clinic-settings";

const clinicSettingsDefault = sql.raw(
  `'${JSON.stringify(DEFAULT_CLINIC_SETTINGS)}'::jsonb`
);

/**
 * clinics — Tenant table. Every business entity references this.
 */
export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).notNull().unique(),
  licenseNumber: varchar("license_number", { length: 100 }),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  /** Clinic-wide appearance + logo metadata; never null after migrate/seed. */
  settings: jsonb("settings")
    .$type<ClinicSettingsJson>()
    .notNull()
    .default(clinicSettingsDefault),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
