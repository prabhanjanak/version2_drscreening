import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const screeningPlacesTable = pgTable("screening_places", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortCode: text("short_code").notNull().unique(),
  district: text("district").notNull(),
  state: text("state").notNull(),
  status: text("status").notNull().default("active"), // active | completed | inactive
  latitude: text("latitude"),
  longitude: text("longitude"),
  taluk: text("taluk"),
  pincode: text("pincode"),
  campDate: text("camp_date"),
  mapLink: text("map_link"),
  sankaraUnit: text("sankara_unit"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertScreeningPlaceSchema = createInsertSchema(screeningPlacesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertScreeningPlace = z.infer<typeof insertScreeningPlaceSchema>;
export type ScreeningPlace = typeof screeningPlacesTable.$inferSelect;
