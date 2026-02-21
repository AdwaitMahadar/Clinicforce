import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { users } from "./auth";

/**
 * medicines — Reference directory for pharmacological data.
 */
export const medicines = pgTable("medicines", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinics.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  brand: varchar("brand", { length: 255 }),
  form: varchar("form", { length: 100 }), // Tablet, Syrup, Capsule, etc.
  lastPrescribedDate: timestamp("last_prescribed_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
