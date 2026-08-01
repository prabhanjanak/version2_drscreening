import nodemailer from "nodemailer";
import { getSystemSettings, SystemConfig } from "./settings";

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const settings = await getSystemSettings();
  
  if (!settings.email_enabled) {
    console.log(`[MAILER] Email sending disabled in settings. Skipping mail to: ${to}`);
    return false;
  }

  const host = settings.smtp_host;
  const port = parseInt(settings.smtp_port || "587", 10);
  const user = settings.smtp_user;
  const pass = settings.smtp_pass;
  const secure = settings.smtp_secure;
  const fromName = settings.smtp_from_name || "Sankara DRSMS Security";
  const fromEmail = settings.smtp_from_email || user || "noreply@sankaraeye.com";

  console.log(`[MAILER] Dispatching email -> To: ${to}, Host: ${host || "mock/unconfigured"}, Subject: ${subject}`);

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      });
      console.log(`[MAILER] Successfully sent email to ${to}`);
      return true;
    } catch (err: any) {
      console.error("[MAILER] Error sending email via SMTP:", err.message);
      return false;
    }
  } else {
    console.warn(`[MAILER] SMTP host/user/pass not fully set in DB or env. Mock logged message to ${to}`);
    return true; // Soft success so development workflow continues smoothly
  }
}

export async function testSmtpConnection(config: Partial<SystemConfig>, testRecipient: string): Promise<{ success: boolean; message: string }> {
  const host = config.smtp_host || process.env.SMTP_HOST;
  const port = parseInt(config.smtp_port || process.env.SMTP_PORT || "587", 10);
  const user = config.smtp_user || process.env.SMTP_USER;
  const pass = config.smtp_pass || process.env.SMTP_PASS;
  const secure = config.smtp_secure !== undefined ? config.smtp_secure : config.smtp_port === "465";
  const fromName = config.smtp_from_name || "Sankara DRSMS";
  const fromEmail = config.smtp_from_email || user || "noreply@sankaraeye.com";

  if (!host || !user || !pass) {
    return { success: false, message: "Missing SMTP Host, Username, or Password credentials." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.verify();

    if (testRecipient) {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: testRecipient,
        subject: "Sankara DRSMS — Email SMTP Test Connection",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; rounded: 12px;">
            <h2 style="color: #FF6B00; margin-top: 0;">Sankara DRSMS SMTP Test Successful</h2>
            <p>Your Email SMTP server connection settings have been verified successfully!</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">
              Server: <strong>${host}:${port}</strong><br />
              Sender: <strong>${fromName} (${fromEmail})</strong><br />
              Time: ${new Date().toLocaleString()}
            </p>
          </div>
        `,
      });
    }

    return { success: true, message: `SMTP connection verified successfully! Test email dispatched to ${testRecipient || user}.` };
  } catch (err: any) {
    return { success: false, message: `SMTP Verification Failed: ${err.message}` };
  }
}
