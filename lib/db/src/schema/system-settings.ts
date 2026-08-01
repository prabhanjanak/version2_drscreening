import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { systemUsersTable } from "./system-users";

export const systemSettingsTable = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => systemUsersTable.id, { onDelete: "set null" }),
});

export const otpVerificationsTable = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => systemUsersTable.id, { onDelete: "cascade" }),
  email: text("email"),
  mobile: text("mobile"),
  otpCode: text("otp_code").notNull(),
  purpose: text("purpose").notNull(), // 'first_login' | 'password_change' | 'reset_password'
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SystemSetting = typeof systemSettingsTable.$inferSelect;
export type OtpVerification = typeof otpVerificationsTable.$inferSelect;
