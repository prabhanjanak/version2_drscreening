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
  diabetesDuration: text("diabetes_duration").notNull(),
  bloodPressure: text("blood_pressure"), // e.g. "120/80"
  drStatus: text("dr_status").notNull(),
  advice: text("advice").notNull(),
  imagePath: text("image_path").notNull(),
  imageQuality: text("image_quality").notNull().default("Good"), // Good | Blur | Ungradable
  latitude: text("latitude"),
  longitude: text("longitude"),
  referralStatus: text("referral_status").notNull().default("Referred"), // Referred | Visited | Treated | Follow-up
  referToBaseHospital: boolean("refer_to_base_hospital").notNull().default(false),
  baseHospitalRemarks: text("base_hospital_remarks"),
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
