import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { screeningPlacesTable } from "./screening-places";
import { systemUsersTable } from "./system-users";

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  uniqueId: text("unique_id").notNull().unique(),
  date: text("date").notNull(), // format YYYY-MM-DD
  screeningPlaceCode: text("screening_place_code").notNull(),
  serialNumber: integer("serial_number").notNull(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  address: text("address"),
  phone: text("phone").notNull(),
  alternatePhone: text("alternate_phone"), // Optional alternate contact number
  referralSource: text("referral_source"), // How patient learned about camp (ASHA, PHC/CHC, Tandora, Banner, Word of Mouth)
  diabetesDuration: text("diabetes_duration").notNull(),
  diabetesMeasureType: text("diabetes_measure_type").default("GRBS (mg/dL)"), // GRBS (mg/dL) | RBS (mg/dL) | FBS | PPBS | HbA1c (%)
  diabetesMeasureValue: text("diabetes_measure_value"), // Numeric glucose value e.g. "185" or "8.2"
  grbsRecordedBy: text("grbs_recorded_by"), // CHC / PHC People | ASHA Worker | Lab Tech | Field Screener
  chcPhcCenterName: text("chc_phc_center_name"), // Name of CHC / PHC conducting test
  bloodPressure: text("blood_pressure"), // e.g. "120/80"
  drStatus: text("dr_status").notNull(),
  hasCataract: text("has_cataract").default("None"), // None | Immature Cataract | Mature Cataract | Hypermature Cataract
  cataractPlanning: text("cataract_planning"), // Scheduled for Next Cataract Camp | Base Hospital Surgery | Transport Required | Counseling Done
  fundusCaptured: boolean("fundus_captured").notNull().default(true), // Yes | No
  fundusNotCapturedReason: text("fundus_not_captured_reason"), // Reason if fundus capture is No
  advice: text("advice").notNull(),
  imagePath: text("image_path").notNull().default("/uploads/no_fundus_photo.png"),
  imageQuality: text("image_quality").notNull().default("Good"), // Good | Blur | Ungradable
  latitude: text("latitude"),
  longitude: text("longitude"),
  referralStatus: text("referral_status").notNull().default("Referred"), // Referred | Visited | Treated | Follow-up
  referToBaseHospital: boolean("refer_to_base_hospital").notNull().default(false),
  baseHospitalRemarks: text("base_hospital_remarks"),
  remarks: text("remarks"),
  referredToGiftOfVision: boolean("referred_to_gift_of_vision").notNull().default(false), // Gift of Vision free sponsorship
  giftOfVisionNotes: text("gift_of_vision_notes"),
  govtSchemes: text("govt_schemes"), // Karnataka Govt / Insurance schemes: Ayushman Bharat, BPL, E-Shram, Yeshasvini, etc.
  
  // Base Hospital Visit & Follow-Up Tracking
  visitedBaseHospital: boolean("visited_base_hospital").notNull().default(false), // Base Hospital visit toggle
  baseHospitalVisitDate: text("base_hospital_visit_date"), // YYYY-MM-DD
  baseHospitalOutcome: text("base_hospital_outcome"), // Laser Done | Anti-VEGF Injection | Vitrectomy | Cataract Surgery | Medical Management
  baseHospitalOutcomeNotes: text("base_hospital_outcome_notes"), // Outcome clinical notes from base hospital
  
  createdBy: integer("created_by").notNull().references(() => systemUsersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;

