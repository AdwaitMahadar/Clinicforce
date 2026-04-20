import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { MEAL_TIMINGS } from "@/lib/constants/prescription";
import { clinics } from "./clinics";
import { users } from "./auth";
import { appointments } from "./appointments";
import { patients } from "./patients";

/** Must match `lib/constants/prescription.ts` — single source for Zod + types. */
export const mealTimingEnum = pgEnum("meal_timing", [...MEAL_TIMINGS]);

/**
 * prescriptions — Structured Rx tied one-to-one to an appointment (lazy-created).
 */
export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "restrict" }),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    doctorId: text("doctor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    chartId: integer("chart_id").notNull(),
    notes: text("notes"),
    /** Draft when null; set only by the publish action when published. */
    publishedAt: timestamp("published_at"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("prescriptions_appointment_id_unique").on(t.appointmentId),
    unique("prescriptions_clinic_chart_id_unique").on(t.clinicId, t.chartId),
    index("idx_prescription_clinic_patient").on(t.clinicId, t.patientId),
  ]
);
