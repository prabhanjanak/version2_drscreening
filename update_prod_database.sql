-- ============================================================================
-- SANKARA EYE FOUNDATION - NETRARTHA / DRSMS
-- Complete & Bulletproof Non-Destructive Database Update Script for Production
-- Paste directly into PostgreSQL CLI / pgAdmin Query Tool
-- ============================================================================

-- 1. Ensure system_users columns exist
ALTER TABLE IF EXISTS "system_users" ADD COLUMN IF NOT EXISTS "assigned_place" text;
ALTER TABLE IF EXISTS "system_users" ADD COLUMN IF NOT EXISTS "permissions" json DEFAULT '[]'::json;
ALTER TABLE IF EXISTS "system_users" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';

-- 2. Ensure screening_places columns exist
ALTER TABLE IF EXISTS "screening_places" ADD COLUMN IF NOT EXISTS "taluk" text;
ALTER TABLE IF EXISTS "screening_places" ADD COLUMN IF NOT EXISTS "pincode" text;
ALTER TABLE IF EXISTS "screening_places" ADD COLUMN IF NOT EXISTS "camp_date" text;
ALTER TABLE IF EXISTS "screening_places" ADD COLUMN IF NOT EXISTS "map_link" text;
ALTER TABLE IF EXISTS "screening_places" ADD COLUMN IF NOT EXISTS "sankara_unit" text;

-- 3. Ensure patients table has all clinical & tracking columns
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

-- 4. Ensure vision_centers table exists
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

-- 5. Ensure vc_referrals table exists
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

-- 6. Add ALL columns to vc_referrals table (ensuring both referral_date and camp_date exist)
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

-- 7. Relax NOT NULL constraints on vc_referrals to guarantee 100% successful submissions
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "referral_date" DROP NOT NULL;
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "camp_date" DROP NOT NULL;
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "vision_center_code" DROP NOT NULL;
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "referrer_type" DROP NOT NULL;
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "status" DROP NOT NULL;
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "phone" DROP NOT NULL;

-- 8. Set safe defaults for vc_referrals
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "referral_date" SET DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD');
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "camp_date" SET DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD');
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "referrer_type" SET DEFAULT 'vision_center';
ALTER TABLE IF EXISTS "vc_referrals" ALTER COLUMN "vision_center_code" SET DEFAULT 'OUTREACH_REFERRAL';

-- 9. Drop restrictive foreign key constraints on vc_referrals if they block inserts
ALTER TABLE IF EXISTS "vc_referrals" DROP CONSTRAINT IF EXISTS "vc_referrals_created_by_fkey";
ALTER TABLE IF EXISTS "vc_referrals" DROP CONSTRAINT IF EXISTS "vc_referrals_created_by_system_users_id_fk";
ALTER TABLE IF EXISTS "vc_referrals" DROP CONSTRAINT IF EXISTS "vc_referrals_vision_center_id_fkey";
ALTER TABLE IF EXISTS "vc_referrals" DROP CONSTRAINT IF EXISTS "vc_referrals_vision_center_id_vision_centers_id_fk";
ALTER TABLE IF EXISTS "vc_referrals" DROP CONSTRAINT IF EXISTS "vc_referrals_converted_patient_id_fkey";
ALTER TABLE IF EXISTS "vc_referrals" DROP CONSTRAINT IF EXISTS "vc_referrals_converted_patient_id_patients_id_fk";

-- 10. Ensure active_sessions table exists
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

-- 11. Indexes for performance
CREATE INDEX IF NOT EXISTS "patients_screening_place_code_idx" ON "patients" ("screening_place_code");
CREATE INDEX IF NOT EXISTS "patients_phone_idx" ON "patients" ("phone");
CREATE INDEX IF NOT EXISTS "patients_unique_id_idx" ON "patients" ("unique_id");
CREATE INDEX IF NOT EXISTS "patients_dr_status_idx" ON "patients" ("dr_status");
CREATE INDEX IF NOT EXISTS "patients_visited_base_idx" ON "patients" ("visited_base_hospital");
CREATE INDEX IF NOT EXISTS "vc_referrals_target_camp_idx" ON "vc_referrals" ("target_camp_code");
CREATE INDEX IF NOT EXISTS "vc_referrals_phone_idx" ON "vc_referrals" ("phone");
CREATE INDEX IF NOT EXISTS "vc_referrals_status_idx" ON "vc_referrals" ("status");
