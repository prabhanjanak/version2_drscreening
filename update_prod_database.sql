-- ============================================================================
-- SANKARA EYE FOUNDATION - NETRARTHA / DRSMS
-- Safe Non-Destructive Database Schema Update Script for Production
-- (Preserves ALL existing patient entries, user accounts, and campsite data)
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

-- 3. Ensure patients table has all new clinical & tracking columns (NON-DESTRUCTIVE)
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

-- 4. Create active_sessions table if not present
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

-- 5. Create vc_referrals table if not present
CREATE TABLE IF NOT EXISTS "vc_referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_name" text NOT NULL,
	"age" integer NOT NULL,
	"gender" text NOT NULL,
	"phone" text NOT NULL,
	"village" text,
	"address" text,
	"blood_sugar" text,
	"dr_notes" text,
	"vision_center_code" text NOT NULL,
	"target_camp_code" text,
	"status" text DEFAULT 'referred' NOT NULL,
	"created_by" integer REFERENCES "system_users"("id"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. Performance & search optimization indexes
CREATE INDEX IF NOT EXISTS "patients_screening_place_code_idx" ON "patients" ("screening_place_code");
CREATE INDEX IF NOT EXISTS "patients_phone_idx" ON "patients" ("phone");
CREATE INDEX IF NOT EXISTS "patients_unique_id_idx" ON "patients" ("unique_id");
CREATE INDEX IF NOT EXISTS "patients_dr_status_idx" ON "patients" ("dr_status");
CREATE INDEX IF NOT EXISTS "patients_visited_base_idx" ON "patients" ("visited_base_hospital");

-- ============================================================================
-- Complete! All your existing patient entries, camps, and users remain intact.
-- ============================================================================
