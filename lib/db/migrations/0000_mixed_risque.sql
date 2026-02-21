CREATE TYPE "public"."user_type" AS ENUM('admin', 'doctor', 'staff');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('pending', 'completed', 'cancelled', 'no-show');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('general', 'follow-up', 'emergency');--> statement-breakpoint
CREATE TYPE "public"."assigned_to_type" AS ENUM('patient', 'user');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('prescription', 'lab-report', 'x-ray', 'scan', 'identification', 'insurance', 'consent-form', 'other');--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"subdomain" varchar(100) NOT NULL,
	"license_number" varchar(100),
	"address" text,
	"phone" varchar(20),
	"email" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clinics_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clinic_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"address" text,
	"chart_id" integer,
	"type" "user_type" DEFAULT 'staff' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_clinic_email_unique" UNIQUE("clinic_id","email"),
	CONSTRAINT "users_clinic_chartid_unique" UNIQUE("clinic_id","chart_id")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"address" text,
	"chart_id" integer NOT NULL,
	"date_of_birth" date,
	"gender" "gender",
	"blood_group" varchar(10),
	"emergency_contact_name" varchar(255),
	"emergency_contact_phone" varchar(20),
	"allergies" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patients_clinic_chartid_unique" UNIQUE("clinic_id","chart_id")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "appointment_status" DEFAULT 'pending' NOT NULL,
	"type" "appointment_type" DEFAULT 'general' NOT NULL,
	"date" timestamp NOT NULL,
	"duration" integer DEFAULT 30 NOT NULL,
	"notes" text,
	"actual_check_in" timestamp,
	"actual_check_out" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" "document_type" DEFAULT 'other' NOT NULL,
	"assigned_to_id" text NOT NULL,
	"assigned_to_type" "assigned_to_type" NOT NULL,
	"appointment_id" uuid,
	"file_key" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"brand" varchar(255),
	"form" varchar(100),
	"last_prescribed_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_patient_name" ON "patients" USING btree ("clinic_id","last_name","first_name");--> statement-breakpoint
CREATE INDEX "idx_appointment_date" ON "appointments" USING btree ("clinic_id","date");--> statement-breakpoint
CREATE INDEX "idx_appointment_status" ON "appointments" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "idx_document_assignment" ON "documents" USING btree ("assigned_to_id","assigned_to_type");