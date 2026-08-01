import { Router } from "express";
import { db, systemUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getSystemSettings, updateSystemSettings, maskSecret, SystemConfig } from "../lib/settings";
import { testSmtpConnection } from "../lib/mailer";
import { testWhatsappConnection } from "../lib/whatsapp";

const router = Router();

// Middleware: Strict Super Admin Authorization Check
function requireSuperAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.userType !== "super_admin") {
    res.status(403).json({ error: "Forbidden: Only Super Admin can view or modify system settings." });
    return;
  }
  next();
}

// GET /api/settings - Fetch current system configuration (Super Admin only)
router.get("/settings", requireAuth(), requireSuperAdmin, async (_req, res): Promise<void> => {
  try {
    const settings = await getSystemSettings();

    const safeSettings = {
      ...settings,
      smtp_pass: maskSecret(settings.smtp_pass),
      whatsapp_access_token: maskSecret(settings.whatsapp_access_token),
      has_smtp_pass: Boolean(settings.smtp_pass),
      has_whatsapp_token: Boolean(settings.whatsapp_access_token),
    };

    res.json(safeSettings);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch settings: " + err.message });
  }
});

// POST /api/settings - Save/Update system configuration (Super Admin only)
router.post("/settings", requireAuth(), requireSuperAdmin, async (req, res): Promise<void> => {
  try {
    const payload = req.body || {};
    const updates: Partial<SystemConfig> = {};

    if (payload.smtp_host !== undefined) updates.smtp_host = String(payload.smtp_host).trim();
    if (payload.smtp_port !== undefined) updates.smtp_port = String(payload.smtp_port).trim();
    if (payload.smtp_user !== undefined) updates.smtp_user = String(payload.smtp_user).trim();
    if (payload.smtp_pass && !payload.smtp_pass.includes("••••")) {
      updates.smtp_pass = String(payload.smtp_pass).trim();
    }
    if (payload.smtp_secure !== undefined) updates.smtp_secure = Boolean(payload.smtp_secure);
    if (payload.smtp_from_email !== undefined) updates.smtp_from_email = String(payload.smtp_from_email).trim();
    if (payload.smtp_from_name !== undefined) updates.smtp_from_name = String(payload.smtp_from_name).trim();
    if (payload.email_enabled !== undefined) updates.email_enabled = Boolean(payload.email_enabled);

    if (payload.whatsapp_phone_number_id !== undefined) updates.whatsapp_phone_number_id = String(payload.whatsapp_phone_number_id).trim();
    if (payload.whatsapp_access_token && !payload.whatsapp_access_token.includes("••••")) {
      updates.whatsapp_access_token = String(payload.whatsapp_access_token).trim();
    }
    if (payload.whatsapp_waba_id !== undefined) updates.whatsapp_waba_id = String(payload.whatsapp_waba_id).trim();
    if (payload.whatsapp_template_name !== undefined) updates.whatsapp_template_name = String(payload.whatsapp_template_name).trim();
    if (payload.whatsapp_enabled !== undefined) updates.whatsapp_enabled = Boolean(payload.whatsapp_enabled);

    if (payload.require_otp_first_login !== undefined) updates.require_otp_first_login = Boolean(payload.require_otp_first_login);
    if (payload.require_otp_password_change !== undefined) updates.require_otp_password_change = Boolean(payload.require_otp_password_change);
    if (payload.session_timeout_minutes !== undefined) updates.session_timeout_minutes = parseInt(String(payload.session_timeout_minutes), 10) || 30;

    const updated = await updateSystemSettings(updates, req.user!.id);

    res.json({
      success: true,
      message: "System settings updated successfully.",
      settings: {
        ...updated,
        smtp_pass: maskSecret(updated.smtp_pass),
        whatsapp_access_token: maskSecret(updated.whatsapp_access_token),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update system settings: " + err.message });
  }
});

// POST /api/settings/test-email - Test Email SMTP connection (Super Admin only)
router.post("/settings/test-email", requireAuth(), requireSuperAdmin, async (req, res): Promise<void> => {
  try {
    const { host, port, user, pass, secure, fromEmail, fromName, recipient } = req.body;
    const current = await getSystemSettings();

    const [superUser] = await db.select().from(systemUsersTable).where(eq(systemUsersTable.id, req.user!.id)).limit(1);

    const configToTest: Partial<SystemConfig> = {
      smtp_host: host || current.smtp_host,
      smtp_port: port || current.smtp_port,
      smtp_user: user || current.smtp_user,
      smtp_pass: (pass && !pass.includes("••••")) ? pass : current.smtp_pass,
      smtp_secure: secure !== undefined ? Boolean(secure) : current.smtp_secure,
      smtp_from_email: fromEmail || current.smtp_from_email,
      smtp_from_name: fromName || current.smtp_from_name,
    };

    const targetRecipient = recipient || superUser?.email || user || "prabhanjan@sankaraeye.com";

    const result = await testSmtpConnection(configToTest, targetRecipient);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: "SMTP Test Error: " + err.message });
  }
});

// POST /api/settings/test-whatsapp - Test Official Meta WhatsApp API connection (Super Admin only)
router.post("/settings/test-whatsapp", requireAuth(), requireSuperAdmin, async (req, res): Promise<void> => {
  try {
    const { phoneNumberId, accessToken, testPhone } = req.body;
    const current = await getSystemSettings();

    const [superUser] = await db.select().from(systemUsersTable).where(eq(systemUsersTable.id, req.user!.id)).limit(1);

    const configToTest: Partial<SystemConfig> = {
      whatsapp_phone_number_id: phoneNumberId || current.whatsapp_phone_number_id,
      whatsapp_access_token: (accessToken && !accessToken.includes("••••")) ? accessToken : current.whatsapp_access_token,
    };

    const targetPhone = testPhone || superUser?.mobile || "8951568286";

    const result = await testWhatsappConnection(configToTest, targetPhone);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: "WhatsApp Test Error: " + err.message });
  }
});

export default router;
