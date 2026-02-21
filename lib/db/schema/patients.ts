import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  date,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { users } from "./auth";

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

/**
 * patients — Individual medical records for clinic clients.
 */
export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "restrict" }),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    address: text("address"),
    chartId: integer("chart_id").notNull(),
    dateOfBirth: date("date_of_birth"),
    gender: genderEnum("gender"),
    bloodGroup: varchar("blood_group", { length: 10 }),
    emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
    emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
    allergies: text("allergies"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("patients_clinic_chartid_unique").on(t.clinicId, t.chartId),
    index("idx_patient_name").on(t.clinicId, t.lastName, t.firstName),
  ]
);
