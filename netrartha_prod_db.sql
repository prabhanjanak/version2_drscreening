-- ============================================================================
-- NETRARTHA - DIABETIC RETINOPATHY SCREENING SYSTEM (SANKARA EYE FOUNDATION)
-- Complete Production Database Schema & Seed Data Script
-- ============================================================================

-- 1. SYSTEM USERS TABLE
CREATE TABLE IF NOT EXISTS "system_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"email" text,
	"mobile" text UNIQUE,
	"user_type" text NOT NULL, -- admin | facility_manager | unit_head | vision_center | screener
	"password_hash" text NOT NULL,
	"assigned_track" text,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"permissions" json DEFAULT '[]'::json,
	"status" text DEFAULT 'active' NOT NULL,
	"assigned_place" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. ACTIVE SESSIONS TABLE
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

-- 3. SCREENING PLACES (CAMPS / BASE UNITS)
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
	"sankara_unit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. VISION CENTERS TABLE
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

-- 5. PATIENTS TABLE (DIABETIC RETINOPATHY SCREENINGS)
-- Unique ID format: SEH/DR/DDMMYYYY/SerialNumber (e.g. SEH/DR/25072026/0001)
CREATE TABLE IF NOT EXISTS "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"unique_id" text NOT NULL UNIQUE,
	"date" text NOT NULL, -- Format: YYYY-MM-DD
	"screening_place_code" text NOT NULL,
	"serial_number" integer NOT NULL,
	"name" text NOT NULL,
	"age" integer NOT NULL,
	"gender" text NOT NULL,
	"address" text,
	"phone" text NOT NULL,
	"diabetes_duration" text NOT NULL,
	"blood_pressure" text,
	"dr_status" text NOT NULL, -- No DR | Mild NPDR | Moderate NPDR | Severe NPDR | PDR
	"advice" text NOT NULL,
	"image_path" text NOT NULL,
	"image_quality" text DEFAULT 'Good' NOT NULL, -- Good | Blur | Ungradable
	"latitude" text,
	"longitude" text,
	"referral_status" text DEFAULT 'Referred' NOT NULL, -- Referred | Visited | Treated | Follow-up
	"refer_to_base_hospital" boolean DEFAULT false NOT NULL,
	"created_by" integer NOT NULL REFERENCES "system_users"("id"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. VISION CENTER REFERRALS TABLE
CREATE TABLE IF NOT EXISTS "vc_referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_name" text NOT NULL,
	"age" integer NOT NULL,
	"gender" text NOT NULL,
	"phone" text NOT NULL,
	"address" text,
	"vision_center_id" integer NOT NULL REFERENCES "vision_centers"("id"),
	"vision_center_code" text NOT NULL,
	"target_camp_code" text NOT NULL,
	"referral_date" text NOT NULL,
	"dr_notes" text,
	"status" text DEFAULT 'pending' NOT NULL, -- pending | screened | completed
	"converted_patient_id" integer REFERENCES "patients"("id"),
	"created_by" integer REFERENCES "system_users"("id"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================================
-- SEED DATA — SANAKARA EYE FOUNDATION STAFF & UNITS
-- Default Password for all accounts: Sankara@123
-- Password Hash: $2b$10$tZlhQyVwJ.2sH1W17a...
-- ============================================================================

INSERT INTO "system_users" ("emp_id", "name", "email", "mobile", "user_type", "password_hash", "must_change_password", "permissions", "assigned_place", "status")
VALUES 
  ('010177', 'Prabhanjan', 'prabhanjan@sankaraeye.com', '8951568286', 'super_admin', '$2b$10$w09ZtJ.c4z63p7kGfHjI7.f7rL/zW85g1l9f1YpD6nO2e7a3c.v7e', false, '["all"]'::json, 'SHIMOGA', 'active'),
  ('006704', 'Kumaraswamy', 'kumaraswamy@sankaraeye.com', '9845012345', 'facility_manager', '$2b$10$w09ZtJ.c4z63p7kGfHjI7.f7rL/zW85g1l9f1YpD6nO2e7a3c.v7e', false, '["all"]'::json, 'SHIMOGA', 'active'),
  ('000338', 'Avinash', 'avinash@sankaraeye.com', '9845023456', 'admin_unit', '$2b$10$w09ZtJ.c4z63p7kGfHjI7.f7rL/zW85g1l9f1YpD6nO2e7a3c.v7e', false, '["all"]'::json, 'SHIMOGA', 'active'),
  ('000470', 'Anitha S', 'anitha@sankaraeye.com', '9845034567', 'unit_head', '$2b$10$w09ZtJ.c4z63p7kGfHjI7.f7rL/zW85g1l9f1YpD6nO2e7a3c.v7e', false, '["all"]'::json, 'SHIMOGA', 'active'),
  ('VC001', 'Chitradurga VC Officer', 'vc001@sankaraeye.com', '9845045678', 'vision_center', '$2b$10$w09ZtJ.c4z63p7kGfHjI7.f7rL/zW85g1l9f1YpD6nO2e7a3c.v7e', false, '["referral"]'::json, 'VC-CTA', 'active')
ON CONFLICT ("emp_id") DO UPDATE SET "password_hash" = EXCLUDED."password_hash";

-- SEED SCREENING PLACES (CAMPS)
INSERT INTO "screening_places" ("name", "short_code", "district", "state", "status", "sankara_unit")
VALUES 
  ('Shimoga Base Hospital', 'SHIMOGA', 'Shimoga', 'Karnataka', 'active', 'Shimoga'),
  ('Chitradurga DR Screening Camp', 'CAMP-CTA', 'Chitradurga', 'Karnataka', 'active', 'Shimoga'),
  ('Davanagere DR Screening Camp', 'CAMP-DVG', 'Davanagere', 'Karnataka', 'active', 'Shimoga'),
  ('Bhadravathi Screening Camp', 'CAMP-BDVT', 'Shimoga', 'Karnataka', 'active', 'Shimoga')
ON CONFLICT ("short_code") DO NOTHING;

-- SEED VISION CENTERS
INSERT INTO "vision_centers" ("name", "short_code", "sankara_unit", "state", "district", "address", "phone", "status")
VALUES 
  ('Chitradurga Vision Center', 'VC-CTA', 'Shimoga', 'Karnataka', 'Chitradurga', 'Main Road, Chitradurga', '08194-223344', 'active'),
  ('Davanagere Vision Center', 'VC-DVG', 'Shimoga', 'Karnataka', 'Davanagere', 'PB Road, Davanagere', '08192-255667', 'active'),
  ('Sagar Vision Center', 'VC-SGR', 'Shimoga', 'Karnataka', 'Shimoga', 'BH Road, Sagar', '08183-221100', 'active')
ON CONFLICT ("short_code") DO NOTHING;

-- SEED DIABETIC RETINOPATHY PATIENT RECORDS
-- Unique ID Standard: SEH/DR/DDMMYYYY/SerialNumber
INSERT INTO "patients" ("unique_id", "date", "screening_place_code", "serial_number", "name", "age", "gender", "address", "phone", "diabetes_duration", "blood_pressure", "dr_status", "advice", "image_path", "image_quality", "referral_status", "refer_to_base_hospital", "created_by")
VALUES 
  ('SEH/DR/25072026/0001', '2026-07-25', 'SHIMOGA', 1, 'Ramesh Rao', 54, 'Male', 'Shimoga Town', '9876543210', '6 Years', '130/85', 'Moderate NPDR', 'Refer to Base Hospital for OCT & Laser evaluation', '/uploads/retina_sample_1.png', 'Good', 'Referred', true, 1),
  ('SEH/DR/25072026/0002', '2026-07-25', 'CAMP-CTA', 2, 'Sunanda Gowda', 61, 'Female', 'Chitradurga Rural', '9876543211', '10 Years', '140/90', 'Severe NPDR', 'Urgent Anti-VEGF / Laser consultation required at Base Hospital', '/uploads/retina_sample_2.png', 'Good', 'Referred', true, 1),
  ('SEH/DR/25072026/0003', '2026-07-25', 'CAMP-DVG', 3, 'Basavarajappa', 48, 'Male', 'Davanagere', '9876543212', '3 Years', '120/80', 'No DR', 'Annual DR rescreening in 12 months', '/uploads/retina_sample_3.png', 'Good', 'Follow-up', false, 1)
ON CONFLICT ("unique_id") DO NOTHING;
