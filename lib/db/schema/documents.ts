import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { users } from "./auth";
import { appointments } from "./appointments";

export const documentTypeEnum = pgEnum("document_type", [
  "prescription",
  "lab-report",
  "x-ray",
  "scan",
  "identification",
  "insurance",
  "consent-form",
  "other",
]);

export const assignedToTypeEnum = pgEnum("assigned_to_type", [
  "patient",
  "user",
]);

/**
 * documents — Digital file repository associated with clinical activities.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    type: documentTypeEnum("type").notNull().default("other"),
    // Polymorphic assignment — can be a patient or a user
    assignedToId: text("assigned_to_id").notNull(),
    assignedToType: assignedToTypeEnum("assigned_to_type").notNull(),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    // S3 / Minio storage
    fileKey: text("file_key").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type").notNull(),
    uploadedBy: text("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_document_assignment").on(t.assignedToId, t.assignedToType),
  ]
);
