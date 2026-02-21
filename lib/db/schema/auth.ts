import {
  pgTable,
  pgEnum,
  text,
  boolean,
  timestamp,
  integer,
  uuid,
  unique,
} from "drizzle-orm/pg-core";
import { clinics } from "./clinics";

export const userTypeEnum = pgEnum("user_type", ["admin", "doctor", "staff"]);

/**
 * users — Better-Auth core table, extended with clinic + business fields.
 */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    clinicId: uuid("clinic_id").references(() => clinics.id, {
      onDelete: "restrict",
    }),
    // Better-Auth required fields
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    // Business fields
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    address: text("address"),
    chartId: integer("chart_id"),
    type: userTypeEnum("type").notNull().default("staff"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    unique("users_clinic_email_unique").on(t.clinicId, t.email),
    unique("users_clinic_chartid_unique").on(t.clinicId, t.chartId),
  ]
);

/**
 * sessions — Better-Auth sessions table.
 */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * accounts — Better-Auth OAuth/credential accounts.
 */
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * verifications — Better-Auth email/token verification records.
 */
export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
