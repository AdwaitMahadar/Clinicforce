import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

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
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
