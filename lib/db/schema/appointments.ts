import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { users } from "./auth";
import { patients } from "./patients";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "completed",
  "cancelled",
  "no-show",
]);

export const appointmentTypeEnum = pgEnum("appointment_type", [
  "general",
  "follow-up",
  "emergency",
]);

/**
 * appointments — Records of clinical consultations or procedures.
 */
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "restrict" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    doctorId: text("doctor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: appointmentStatusEnum("status").notNull().default("pending"),
    type: appointmentTypeEnum("type").notNull().default("general"),
    date: timestamp("date").notNull(),
    duration: integer("duration").notNull().default(30), // minutes
    notes: text("notes"),
    actualCheckIn: timestamp("actual_check_in"),
    actualCheckOut: timestamp("actual_check_out"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_appointment_date").on(t.clinicId, t.date),
    index("idx_appointment_status").on(t.clinicId, t.status),
  ]
);
