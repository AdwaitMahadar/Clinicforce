ALTER TABLE "appointments" RENAME COLUMN "date" TO "scheduled_at";--> statement-breakpoint
ALTER INDEX "idx_appointment_date" RENAME TO "idx_appointment_scheduled_at";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "scheduled_start_time";
