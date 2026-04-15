CREATE TYPE "public"."activity_action" AS ENUM('created', 'updated', 'deactivated', 'reactivated', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."activity_entity_type" AS ENUM('patient', 'appointment', 'medicine', 'document', 'user');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"entity_type" "activity_entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"action" "activity_action" NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"actor_role" text NOT NULL,
	"metadata" jsonb,
	"subscribers" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_log_subscribers" ON "activity_log" USING btree ("subscribers");--> statement-breakpoint
CREATE INDEX "idx_activity_log_clinic_time" ON "activity_log" USING btree ("clinic_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_log_entity" ON "activity_log" USING btree ("clinic_id","entity_type","entity_id");