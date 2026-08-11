-- ============================================================================
-- SANKARA EYE FOUNDATION - NETRARTHA / DRSMS
-- Complete & Bulletproof Non-Destructive Database Update Script for Production
-- Paste directly into PostgreSQL CLI (psql)
-- ============================================================================

-- 1. Ensure SYSTEM_USERS table exists & has all columns
CREATE TABLE IF NOT EXISTS "system_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"email" text,
	"mobile" text UNIQUE,
	"user_type" text NOT NULL,
	"password_hash" text NOT NULL,
	"assigned_track" text,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"permissions" json DEFAULT '[]'::json,
	"status" text DEFAULT 'active' NOT NULL,
	"assigned_place" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE IF EXISTS "system_users" ADD COLUMN IF NOT EXISTS "assigned_place" text;
ALTER TABLE IF EXISTS "system_users" ADD COLUMN IF NOT EXISTS "permissions" json DEFAULT '[]'::json;
ALTER TABLE IF EXISTS "system_users" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';

-- 2. Ensure SYSTEM_SETTINGS table exists (CRITICAL: Fixes "relation system_settings does not exist")
CREATE TABLE IF NOT EXISTS "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer REFERENCES "system_users"("id") ON DELETE SET NULL
);

-- Insert default system settings if not present
INSERT INTO "system_settings" ("key", "value", "description") VALUES
('smtp_host', '', 'SMTP mail server host'),
('smtp_port', '587', 'SMTP port (587 or 465)'),
('smtp_user', '', 'SMTP username'),
('smtp_pass', '', 'SMTP password'),
('smtp_secure', 'false', 'Use TLS/SSL for SMTP'),
('smtp_from_email', 'noreply@sankaraeye.com', 'System outgoing email address'),
('smtp_from_name', 'Sankara DRSMS Security', 'Sender name'),
('email_enabled', 'true', 'Enable or disable outgoing emails'),
('require_otp_first_login', 'true', 'Require OTP on first login'),
('require_otp_password_change', 'true', 'Require OTP when changing password'),
('session_timeout_minutes', '30', 'Inactive session timeout')
ON CONFLICT ("key") DO NOTHING;

-- 3. Ensure OTP_VERIFICATIONS table exists
CREATE TABLE IF NOT EXISTS "otp_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer REFERENCES "system_users"("id") ON DELETE CASCADE,
	"email" text,
	"mobile" text,
	"otp_code" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Ensure ACTIVITY_LOGS table exists
CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Ensure ACTIVE_SESSIONS table exists
CREATE TABLE IF NOT EXISTS "active_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL UNIQUE,
	"user_id" integer NOT NULL REFERENCES "system_users"("id") ON DELETE CASCADE,
	"user_type" text NOT NULL,
	"user_name" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"device_type" text,
	"device_name" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. Ensure SCREENING_PLACES table exists & has all columns
CREATE TABLE IF NOT EXISTS "screening_places" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_code" text NOT NULL UNIQUE,
	"district" text NOT NULL,
	"state" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"latitude" text,
	"longitude" text,
	"taluk" text,
	"pincode" text,
	"camp_date" text,
	"map_link" text,
	"sankara_unit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE IF EXISTS "screening_places" ADD COLUMN IF NOT EXISTS "taluk" text;
ALTER TABLE IF EXISTS "screening_places" ADD COLUMN IF NOT EXISTS "pincode" text;
ALTER TABLE IF EXISTS "screening_places" ADD COLUMN IF NOT EXISTS "camp_date" text;
ALTER TABLE IF EXISTS "screening_places" ADD COLUMN IF NOT EXISTS "map_link" text;
ALTER TABLE IF EXISTS "screening_places" ADD COLUMN IF NOT EXISTS "sankara_unit" text;

-- 7. Ensure PATIENTS table exists & has all clinical columns
CREATE TABLE IF NOT EXISTS "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"unique_id" text NOT NULL UNIQUE,
	"date" text NOT NULL,
	"screening_place_code" text NOT NULL,
	"serial_number" integer NOT NULL,
	"name" text NOT NULL,
	"age" integer NOT NULL,
	"gender" text NOT NULL,
	"address" text,
	"phone" text NOT NULL,
	"alternate_phone" text,
	"referral_source" text DEFAULT 'ASHA Outreach',
	"diabetes_duration" text NOT NULL,
	"diabetes_measure_type" text DEFAULT 'GRBS (mg/dL)',
	"diabetes_measure_value" text,
	"grbs_recorded_by" text,
	"chc_phc_center_name" text,
	"blood_pressure" text,
	"dr_status" text NOT NULL,
	"has_cataract" text DEFAULT 'None',
	"cataract_planning" text,
	"fundus_captured" boolean DEFAULT true NOT NULL,
	"fundus_not_captured_reason" text,
	"advice" text NOT NULL,
	"image_path" text DEFAULT '/uploads/no_fundus_photo.png' NOT NULL,
	"image_quality" text DEFAULT 'Good' NOT NULL,
	"latitude" text,
	"longitude" text,
	"referral_status" text DEFAULT 'Referred' NOT NULL,
	"refer_to_base_hospital" boolean DEFAULT false NOT NULL,
	"base_hospital_remarks" text,
	"remarks" text,
	"referred_to_gift_of_vision" boolean DEFAULT false NOT NULL,
	"gift_of_vision_notes" text,
	"govt_schemes" text,
	"visited_base_hospital" boolean DEFAULT false NOT NULL,
	"base_hospital_visit_date" text,
	"base_hospital_outcome" text,
	"base_hospital_outcome_notes" text,
	"created_by" integer NOT NULL REFERENCES "system_users"("id"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "alternate_phone" text;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "referral_source" text DEFAULT 'ASHA Outreach';
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "diabetes_measure_type" text DEFAULT 'GRBS (mg/dL)';
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "diabetes_measure_value" text;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "grbs_recorded_by" text;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "chc_phc_center_name" text;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "blood_pressure" text;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "has_cataract" text DEFAULT 'None';
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "cataract_planning" text;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "fundus_captured" boolean DEFAULT true NOT NULL;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "fundus_not_captured_reason" text;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "refer_to_base_hospital" boolean DEFAULT false NOT NULL;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "base_hospital_remarks" text;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "referred_to_gift_of_vision" boolean DEFAULT false NOT NULL;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "gift_of_vision_notes" text;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "govt_schemes" text;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "visited_base_hospital" boolean DEFAULT false NOT NULL;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "base_hospital_visit_date" text;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "base_hospital_outcome" text;
ALTER TABLE IF EXISTS "patients" ADD COLUMN IF NOT EXISTS "base_hospital_outcome_notes" text;

-- 8. Ensure VISION_CENTERS table exists
CREATE TABLE IF NOT EXISTS "vision_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_code" text NOT NULL UNIQUE,
	"sankara_unit" text NOT NULL,
	"state" text NOT NULL,
	"district" text NOT NULL,
	"taluk" text,
	"pincode" text,
	"address" text,
	"phone" text,
	"maps_url" text,
	"latitude" text,
	"longitude" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 9. Ensure VC_REFERRALS table exists & has all columns
CREATE TABLE IF NOT EXISTS "vc_referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_name" text NOT NULL,
	"age" integer NOT NULL,
	"gender" text NOT NULL,
	"phone" text NOT NULL,
	"village" text,
	"address" text,
	"vision_center_code" text NOT NULL,
	"target_camp_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "referrer_type" text DEFAULT 'vision_center';
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "phc_name" text;
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "random_blood_sugar" text;
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "blood_sugar" text;
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "symptoms" text;
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "camp_date" text DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD');
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "referral_date" text DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD');
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "dr_notes" text;
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "village" text;
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "vision_center_id" integer;
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "vision_center_code" text DEFAULT 'OUTREACH_REFERRAL';
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "converted_patient_id" integer;
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "created_by" integer;
ALTER TABLE IF EXISTS "vc_referrals" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';

-- Drop strict NOT NULL constraints & foreign keys so referrals NEVER fail
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "referral_date" DROP NOT NULL;
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "camp_date" DROP NOT NULL;
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "vision_center_code" DROP NOT NULL;
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "referrer_type" DROP NOT NULL;
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "status" DROP NOT NULL;
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "phone" DROP NOT NULL;

ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "referral_date" SET DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD');
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "camp_date" SET DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD');
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "referrer_type" SET DEFAULT 'vision_center';
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "vision_center_code" SET DEFAULT 'OUTREACH_REFERRAL';

ALTER TABLE IF EXISTS "vc_referrals" DROP CONSTRAINT IF EXISTS "vc_referrals_created_by_fkey";
ALTER TABLE IF EXISTS "vc_referrals" DROP CONSTRAINT IF EXISTS "vc_referrals_created_by_system_users_id_fk";
ALTER TABLE IF EXISTS "vc_referrals" DROP CONSTRAINT IF EXISTS "vc_referrals_vision_center_id_fkey";
ALTER TABLE IF EXISTS "vc_referrals" DROP CONSTRAINT IF EXISTS "vc_referrals_vision_center_id_vision_centers_id_fk";

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS "patients_screening_place_code_idx" ON "patients" ("screening_place_code");
CREATE INDEX IF NOT EXISTS "patients_phone_idx" ON "patients" ("phone");
CREATE INDEX IF NOT EXISTS "patients_unique_id_idx" ON "patients" ("unique_id");
CREATE INDEX IF NOT EXISTS "patients_dr_status_idx" ON "patients" ("dr_status");
CREATE INDEX IF NOT EXISTS "patients_visited_base_idx" ON "patients" ("visited_base_hospital");
CREATE INDEX IF NOT EXISTS "vc_referrals_target_camp_idx" ON "vc_referrals" ("target_camp_code");
CREATE INDEX IF NOT EXISTS "vc_referrals_phone_idx" ON "vc_referrals" ("phone");
CREATE INDEX IF NOT EXISTS "vc_referrals_status_idx" ON "vc_referrals" ("status");
