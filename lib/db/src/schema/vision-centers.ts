import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const visionCentersTable = pgTable("vision_centers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortCode: text("short_code").notNull().unique(),
  sankaraUnit: text("sankara_unit").notNull(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  taluk: text("taluk"),
  pincode: text("pincode"),
  address: text("address"),
  phone: text("phone"),
  mapsUrl: text("maps_url"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  status: text("status").notNull().default("active"), // active | inactive
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVisionCenterSchema = createInsertSchema(visionCentersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVisionCenter = z.infer<typeof insertVisionCenterSchema>;
export type VisionCenter = typeof visionCentersTable.$inferSelect;
