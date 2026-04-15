DROP INDEX "idx_activity_log_subscribers";--> statement-breakpoint
CREATE INDEX "idx_activity_log_subscribers" ON "activity_log" USING gin ("subscribers");