import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { medicines } from "./medicines";
import { mealTimingEnum, prescriptions } from "./prescriptions";

/**
 * prescription_items — Line items on a prescription (dosage slots + metadata).
 */
export const prescriptionItems = pgTable(
  "prescription_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "cascade" }),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "restrict" }),
    /** Null while draft; filled at publish from `medicines` denormalization. */
    medicineName: varchar("medicine_name", { length: 255 }),
    morningEnabled: boolean("morning_enabled").notNull().default(false),
    morningQuantity: integer("morning_quantity").notNull().default(1),
    morningTiming: mealTimingEnum("morning_timing")
      .notNull()
      .default("before_food"),
    afternoonEnabled: boolean("afternoon_enabled").notNull().default(false),
    afternoonQuantity: integer("afternoon_quantity").notNull().default(1),
    afternoonTiming: mealTimingEnum("afternoon_timing")
      .notNull()
      .default("before_food"),
    nightEnabled: boolean("night_enabled").notNull().default(false),
    nightQuantity: integer("night_quantity").notNull().default(1),
    nightTiming: mealTimingEnum("night_timing")
      .notNull()
      .default("before_food"),
    duration: varchar("duration", { length: 255 }),
    remarks: text("remarks"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("prescription_items_prescription_medicine_unique").on(
      t.prescriptionId,
      t.medicineId
    ),
    index("idx_prescription_items_sort").on(t.prescriptionId, t.sortOrder),
  ]
);
