import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { visionCentersTable } from "./vision-centers";
import { systemUsersTable } from "./system-users";
import { patientsTable } from "./patients";

export const vcReferralsTable = pgTable("vc_referrals", {
  id: serial("id").primaryKey(),
  patientName: text("patient_name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  visionCenterId: integer("vision_center_id").references(() => visionCentersTable.id),
  visionCenterCode: text("vision_center_code").notNull(),
  referrerType: text("referrer_type").notNull().default("vision_center"), // vision_center | asha_worker
  phcName: text("phc_name"), // Primary Health Center / Village Sub-Center name
  randomBloodSugar: text("random_blood_sugar"), // RBS reading if recorded (e.g. 180 mg/dL)
  symptoms: text("symptoms"), // Reported vision symptoms
  targetCampCode: text("target_camp_code").notNull(),
  referralDate: text("referral_date").notNull(), // YYYY-MM-DD
  drNotes: text("dr_notes"), // Clinical notes / tele-ophthalmology findings
  status: text("status").notNull().default("pending"), // pending | screened | completed
  convertedPatientId: integer("converted_patient_id").references(() => patientsTable.id),
  createdBy: integer("created_by").references(() => systemUsersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVcReferralSchema = createInsertSchema(vcReferralsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVcReferral = z.infer<typeof insertVcReferralSchema>;
export type VcReferral = typeof vcReferralsTable.$inferSelect;
