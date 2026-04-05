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
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_CATEGORIES,
  APPOINTMENT_VISIT_TYPES,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
} from "@/lib/constants/appointment";

/** Must match `lib/constants/appointment.ts` — single source for Zod + types. */
export const appointmentStatusEnum = pgEnum("appointment_status", [
  ...APPOINTMENT_STATUSES,
]);

export const appointmentCategoryEnum = pgEnum("appointment_category", [
  ...APPOINTMENT_CATEGORIES,
]);

export const appointmentVisitTypeEnum = pgEnum("appointment_visit_type", [
  ...APPOINTMENT_VISIT_TYPES,
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
    title: varchar("title", { length: 255 }),
    description: text("description"),
    status: appointmentStatusEnum("status").notNull().default("scheduled"),
    category: appointmentCategoryEnum("category").notNull(),
    visitType: appointmentVisitTypeEnum("visit_type").notNull(),
    /** Scheduled start instant (date + time combined). */
    scheduledAt: timestamp("scheduled_at").notNull(),
    duration: integer("duration").notNull().default(DEFAULT_APPOINTMENT_DURATION_MINUTES),
    notes: text("notes"),
    actualCheckIn: timestamp("actual_check_in"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_appointment_scheduled_at").on(t.clinicId, t.scheduledAt),
    index("idx_appointment_status").on(t.clinicId, t.status),
  ]
);
