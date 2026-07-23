-- Database Schema Updates for Vision 2020 Portal (Version 1.0.3)
-- Run this script in your production database to update the schema and reset the admin password.

-- 1. Add missing columns to existing tables
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "clean_name" text;
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "delegate_type" text DEFAULT 'delegate' NOT NULL;
ALTER TABLE "submission_settings" ADD COLUMN IF NOT EXISTS "google_sheet_url" text;
ALTER TABLE "submission_settings" ADD COLUMN IF NOT EXISTS "google_service_account_email" text;
ALTER TABLE "submission_settings" ADD COLUMN IF NOT EXISTS "google_service_account_key" text;

-- 2. Create the new Google Sheets Sync Sessions table
CREATE TABLE IF NOT EXISTS "sync_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"google_sheet_id" text NOT NULL,
	"sheet_name" text DEFAULT '',
	"location_name" text NOT NULL DEFAULT 'Sankara Eye Hospital',
	"is_active" boolean NOT NULL DEFAULT false,
	"field_mappings" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Create performance optimization indexes
CREATE INDEX IF NOT EXISTS "assignments_participant_id_idx" ON "assignments" ("participant_id");
CREATE INDEX IF NOT EXISTS "attendance_logs_participant_id_idx" ON "attendance_logs" ("participant_id");
CREATE INDEX IF NOT EXISTS "uploaded_files_assignment_id_idx" ON "uploaded_files" ("assignment_id");
CREATE INDEX IF NOT EXISTS "food_logs_participant_id_idx" ON "food_logs" ("participant_id");
CREATE INDEX IF NOT EXISTS "food_logs_food_session_id_idx" ON "food_logs" ("food_session_id");
CREATE INDEX IF NOT EXISTS "food_logs_part_sess_idx" ON "food_logs" ("participant_id", "food_session_id");
CREATE INDEX IF NOT EXISTS "goodies_logs_participant_id_idx" ON "goodies_logs" ("participant_id");
CREATE INDEX IF NOT EXISTS "participants_email_idx" ON "participants" ("email");
CREATE INDEX IF NOT EXISTS "participants_clean_name_idx" ON "participants" ("clean_name");
CREATE INDEX IF NOT EXISTS "participants_is_on_spot_idx" ON "participants" ("is_on_spot");
CREATE INDEX IF NOT EXISTS "rsvp_participant_id_idx" ON "rsvp" ("participant_id");

-- 4. Update password for Super Admin user '010177' to 'Sankara@123' and clear password reset flag
UPDATE "system_users"
SET "password_hash" = '$2b$10$3sYRn3s8zaYvcWiitbAqAedNWJHteq5jiHReirMpxTUU2i7CiCRQS',
    "must_change_password" = false
WHERE "emp_id" = '010177';

-- 5. Add live TV URL to submission settings
ALTER TABLE "submission_settings" ADD COLUMN IF NOT EXISTS "live_tv_url" text;
