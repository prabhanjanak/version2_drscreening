import { pgTable, text, serial, timestamp, boolean, json, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemUsersTable = pgTable("system_users", {
  id: serial("id").primaryKey(),
  empId: text("emp_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  mobile: text("mobile").unique(),
  userType: text("user_type").notNull(), // admin | track_coordinator | food_coordinator | scientific_committee | pr_member
  passwordHash: text("password_hash").notNull(),
  assignedTrack: text("assigned_track"),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  // Granular scanning permissions: array of "attendance" | "goodies" | "food"
  permissions: json("permissions").$type<string[]>().default([]),
  status: text("status").notNull().default("active"), // active | inactive | deactivated
  assignedPlace: text("assigned_place"), // Short code of screening place
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSystemUserSchema = createInsertSchema(systemUsersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSystemUser = z.infer<typeof insertSystemUserSchema>;
export type SystemUser = typeof systemUsersTable.$inferSelect;

export const activeSessionsTable = pgTable("active_sessions", {
  id: serial("id").primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: integer("user_id").notNull().references(() => systemUsersTable.id, { onDelete: "cascade" }),
  userType: text("user_type").notNull(),
  userName: text("user_name").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceType: text("device_type"),
  deviceName: text("device_name"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

