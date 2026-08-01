import { db, systemSettingsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

export interface SystemConfig {
  // Email SMTP
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
  smtp_from_email: string;
  smtp_from_name: string;
  email_enabled: boolean;

  // WhatsApp Meta Cloud API
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
  whatsapp_waba_id: string;
  whatsapp_template_name: string;
  whatsapp_enabled: boolean;

  // Security Policies
  require_otp_first_login: boolean;
  require_otp_password_change: boolean;
  session_timeout_minutes: number;
}

export const DEFAULT_SETTINGS: SystemConfig = {
  smtp_host: process.env.SMTP_HOST || "",
  smtp_port: process.env.SMTP_PORT || "587",
  smtp_user: process.env.SMTP_USER || "",
  smtp_pass: process.env.SMTP_PASS || "",
  smtp_secure: process.env.SMTP_PORT === "465",
  smtp_from_email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "noreply@sankaraeye.com",
  smtp_from_name: process.env.SMTP_FROM_NAME || "Sankara DRSMS Security",
  email_enabled: true,

  whatsapp_phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  whatsapp_access_token: process.env.WHATSAPP_ACCESS_TOKEN || "",
  whatsapp_waba_id: process.env.WHATSAPP_WABA_ID || "",
  whatsapp_template_name: process.env.WHATSAPP_TEMPLATE_NAME || "drsms_otp_code",
  whatsapp_enabled: false,

  require_otp_first_login: true,
  require_otp_password_change: true,
  session_timeout_minutes: 30,
};

export async function getSystemSettings(): Promise<SystemConfig> {
  try {
    const rows = await db.select().from(systemSettingsTable);
    const settingsMap: Record<string, string> = {};
    for (const r of rows) {
      if (r.value !== null && r.value !== undefined) {
        settingsMap[r.key] = r.value;
      }
    }

    return {
      smtp_host: settingsMap["smtp_host"] ?? DEFAULT_SETTINGS.smtp_host,
      smtp_port: settingsMap["smtp_port"] ?? DEFAULT_SETTINGS.smtp_port,
      smtp_user: settingsMap["smtp_user"] ?? DEFAULT_SETTINGS.smtp_user,
      smtp_pass: settingsMap["smtp_pass"] ?? DEFAULT_SETTINGS.smtp_pass,
      smtp_secure: settingsMap["smtp_secure"] !== undefined 
        ? settingsMap["smtp_secure"] === "true" 
        : DEFAULT_SETTINGS.smtp_secure,
      smtp_from_email: settingsMap["smtp_from_email"] ?? DEFAULT_SETTINGS.smtp_from_email,
      smtp_from_name: settingsMap["smtp_from_name"] ?? DEFAULT_SETTINGS.smtp_from_name,
      email_enabled: settingsMap["email_enabled"] !== undefined 
        ? settingsMap["email_enabled"] === "true" 
        : DEFAULT_SETTINGS.email_enabled,

      whatsapp_phone_number_id: settingsMap["whatsapp_phone_number_id"] ?? DEFAULT_SETTINGS.whatsapp_phone_number_id,
      whatsapp_access_token: settingsMap["whatsapp_access_token"] ?? DEFAULT_SETTINGS.whatsapp_access_token,
      whatsapp_waba_id: settingsMap["whatsapp_waba_id"] ?? DEFAULT_SETTINGS.whatsapp_waba_id,
      whatsapp_template_name: settingsMap["whatsapp_template_name"] ?? DEFAULT_SETTINGS.whatsapp_template_name,
      whatsapp_enabled: settingsMap["whatsapp_enabled"] !== undefined 
        ? settingsMap["whatsapp_enabled"] === "true" 
        : DEFAULT_SETTINGS.whatsapp_enabled,

      require_otp_first_login: settingsMap["require_otp_first_login"] !== undefined 
        ? settingsMap["require_otp_first_login"] === "true" 
        : DEFAULT_SETTINGS.require_otp_first_login,
      require_otp_password_change: settingsMap["require_otp_password_change"] !== undefined 
        ? settingsMap["require_otp_password_change"] === "true" 
        : DEFAULT_SETTINGS.require_otp_password_change,
      session_timeout_minutes: settingsMap["session_timeout_minutes"] 
        ? parseInt(settingsMap["session_timeout_minutes"], 10) 
        : DEFAULT_SETTINGS.session_timeout_minutes,
    };
  } catch (err) {
    console.error("[SETTINGS] Failed to read system settings from DB, using defaults:", err);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSystemSettings(newSettings: Partial<SystemConfig>, updatedByUserId?: number): Promise<SystemConfig> {
  const current = await getSystemSettings();
  const updated = { ...current, ...newSettings };

  for (const [k, v] of Object.entries(newSettings)) {
    if (v === undefined) continue;
    const strVal = typeof v === "boolean" ? (v ? "true" : "false") : String(v);

    const [existing] = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.key, k)).limit(1);
    if (existing) {
      await db.update(systemSettingsTable)
        .set({ value: strVal, updatedAt: new Date(), updatedBy: updatedByUserId || null })
        .where(eq(systemSettingsTable.key, k));
    } else {
      await db.insert(systemSettingsTable).values({
        key: k,
        value: strVal,
        description: `Configured setting: ${k}`,
        updatedBy: updatedByUserId || null,
      });
    }
  }

  return updated;
}

export function maskSecret(val?: string): string {
  if (!val || val.length === 0) return "";
  if (val.length <= 4) return "****";
  return val.slice(0, 3) + "••••••••" + val.slice(-3);
}
