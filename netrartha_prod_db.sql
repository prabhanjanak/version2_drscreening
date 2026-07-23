-- PostgreSQL Database Creation Script for Vision 2020 Portal
-- Run this script in your PostgreSQL database (e.g., via psql or pgAdmin) to create the schema.

CREATE TABLE IF NOT EXISTS "participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"registration_number" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"mobile" text,
	"institution" text NOT NULL,
	"password_hash" text,
	"reset_token" text,
	"reset_token_expiry" timestamp with time zone,
	"otp_code" text,
	"otp_expires" timestamp with time zone,
	"address" text,
	"age" text,
	"gender" text,
	"is_on_spot" boolean DEFAULT false,
	"is_on_spot_linked" boolean DEFAULT false,
	"is_on_spot_onboarded" boolean DEFAULT false,
	"is_paid" boolean DEFAULT false NOT NULL,
	"utr_number" text DEFAULT NULL,
	"event_reminder_sent" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_sponsored" boolean DEFAULT false NOT NULL,
	"sponsor_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_registration_number_unique" UNIQUE("registration_number"),
	CONSTRAINT "participants_mobile_unique" UNIQUE("mobile")
);

CREATE TABLE IF NOT EXISTS "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant_id" integer NOT NULL,
	"role" text NOT NULL,
	"track" text NOT NULL,
	"session_name" text,
	"hall" text,
	"date" text,
	"time" text,
	"presentation_title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "uploaded_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"file_type" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"size" integer,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "system_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"mobile" text,
	"user_type" text NOT NULL,
	"password_hash" text NOT NULL,
	"assigned_track" text,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"permissions" json DEFAULT '[]'::json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_users_emp_id_unique" UNIQUE("emp_id"),
	CONSTRAINT "system_users_mobile_unique" UNIQUE("mobile")
);

CREATE TABLE IF NOT EXISTS "food_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant_id" integer NOT NULL,
	"food_session_id" integer NOT NULL,
	"coordinator_id" integer,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "food_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "attendance_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant_id" integer NOT NULL,
	"scanned_by" integer,
	"day" text DEFAULT 'Day 1' NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "submission_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"submissions_open" boolean DEFAULT true NOT NULL,
	"otp_mode" text DEFAULT 'static' NOT NULL,
	"test_otps" text DEFAULT '111111,222222,333333' NOT NULL,
	"whatsapp_api_key" text,
	"whatsapp_instance_id" text,
	"whatsapp_template" text,
	"smtp_host" text,
	"smtp_port" integer,
	"smtp_secure" boolean DEFAULT false NOT NULL,
	"smtp_user" text,
	"smtp_pass" text,
	"smtp_from_email" text,
	"smtp_from_name" text,
	"session_timeout_minutes" integer DEFAULT 30 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "goodies_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant_id" integer NOT NULL,
	"scanned_by" integer,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "active_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"user_id" integer NOT NULL,
	"user_type" text NOT NULL,
	"user_name" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"device_type" text,
	"device_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "active_sessions_session_token_unique" UNIQUE("session_token")
);

CREATE TABLE IF NOT EXISTS "personal_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant_id" integer NOT NULL,
	"age" text,
	"gender" text,
	"dietary_preference" text,
	"city" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_details_participant_id_unique" UNIQUE("participant_id")
);

CREATE TABLE IF NOT EXISTS "rsvp" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant_id" integer NOT NULL,
	"track_name" text NOT NULL,
	"session_name" text NOT NULL,
	"session_date" text NOT NULL,
	"session_time" text NOT NULL,
	"participant_email" text,
	"reminder1_sent_at" timestamp with time zone,
	"reminder2_sent_at" timestamp with time zone,
	"email_open_token" text,
	"email_opened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rsvp_email_open_token_unique" UNIQUE("email_open_token")
);

CREATE TABLE IF NOT EXISTS "sync_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"google_sheet_id" text NOT NULL,
	"sheet_name" text DEFAULT '',
	"location_name" text DEFAULT 'Sankara Eye Hospital' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"field_mappings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Foreign Key Constraints
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_food_session_id_food_sessions_id_fk" FOREIGN KEY ("food_session_id") REFERENCES "public"."food_sessions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_coordinator_id_system_users_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."system_users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_scanned_by_system_users_id_fk" FOREIGN KEY ("scanned_by") REFERENCES "public"."system_users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "personal_details" ADD CONSTRAINT "personal_details_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rsvp" ADD CONSTRAINT "rsvp_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;

-- Seed Initial Super Admin User (Default Password: admin123)
-- Password will be forced to change on first login.
INSERT INTO "system_users" ("emp_id", "name", "email", "mobile", "user_type", "password_hash", "must_change_password", "permissions")
VALUES ('010177', 'Prabhanjan', 'prabhanjan@sankaraeye.com', '8951568286', 'super_admin', '$2b$10$mDPvX6lmNPaps6Tdbjve2ur34AKxDJa.P2W.3mIwwmmJPuH/Q.vQu', true, '["attendance", "goodies", "food"]'::json);
