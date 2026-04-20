ALTER TABLE "prescription_items" ALTER COLUMN "medicine_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "published_at" timestamp;