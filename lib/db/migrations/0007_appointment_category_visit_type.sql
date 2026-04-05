CREATE TYPE "public"."appointment_category" AS ENUM('general', 'orthopedic', 'physiotherapy');--> statement-breakpoint
CREATE TYPE "public"."appointment_visit_type" AS ENUM('general', 'first-visit', 'follow-up-visit');--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "category" "appointment_category";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "visit_type" "appointment_visit_type";--> statement-breakpoint
UPDATE "appointments" SET "category" = 'general', "visit_type" = 'general' WHERE "category" IS NULL OR "visit_type" IS NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "visit_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "type";--> statement-breakpoint
DROP TYPE "public"."appointment_type";--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "duration" SET DEFAULT 15;--> statement-breakpoint
