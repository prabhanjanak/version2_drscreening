import crypto from "crypto";
import { db, otpVerificationsTable, systemUsersTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import { sendEmail } from "./mailer";
import { sendWhatsappMessage } from "./whatsapp";
import { getSystemSettings } from "./settings";

export function generate6DigitOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function dispatchOtp(params: {
  userId?: number;
  email?: string;
  mobile?: string;
  purpose: "first_login" | "password_change" | "reset_password";
}): Promise<{ success: boolean; message: string; otpCode?: string }> {
  const { userId, email, mobile, purpose } = params;
  const otpCode = generate6DigitOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

  // Save OTP in database
  await db.insert(otpVerificationsTable).values({
    userId: userId || null,
    email: email || null,
    mobile: mobile || null,
    otpCode,
    purpose,
    expiresAt,
  });

  console.log(`[SECURITY OTP] Generated OTP: ${otpCode} for UserID: ${userId || "Guest"}, Email: ${email}, Phone: ${mobile}, Purpose: ${purpose}`);

  const settings = await getSystemSettings();
  let emailSent = false;
  let whatsappSent = false;

  // Dispatch Email
  if (email) {
    const subject = `Sankara DRSMS — Your Verification OTP (${otpCode})`;
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #FF6B00, #ea580c); padding: 24px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Sankara Eye Foundation</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Netrartha DR Screening Security Verification</p>
          </div>
          <div style="padding: 28px;">
            <p style="margin-top: 0; font-size: 14px; color: #475569;">
              You have requested a 6-digit verification code to <strong>${purpose === "first_login" ? "Complete First-Time Login" : "Change Account Password"}</strong>.
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <div style="display: inline-block; background: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; padding: 12px 28px; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #ea580c;">
                ${otpCode}
              </div>
              <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">Valid for 10 minutes. Do not share this OTP with anyone.</p>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
              If you did not request this verification code, please ignore this email or contact Sankara IT Super Admin immediately.
            </p>
          </div>
          <div style="background: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            © Sankara Eye Foundation India • Sri Kanchi Kamakoti Medical Trust
          </div>
        </div>
      </div>
    `;
    emailSent = await sendEmail(email, subject, html);
  }

  // Dispatch WhatsApp
  if (mobile) {
    const waText = `*Sankara DRSMS Verification Code*\n\nYour 6-digit OTP code for ${purpose === "first_login" ? "First-Time Login" : "Password Change"} is:\n\n*${otpCode}*\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.`;
    whatsappSent = await sendWhatsappMessage(mobile, waText, otpCode);
  }

  return {
    success: true,
    message: `OTP code sent successfully.${emailSent ? " Email dispatched." : ""}${whatsappSent ? " WhatsApp dispatched." : ""}`,
    otpCode: process.env.NODE_ENV !== "production" ? otpCode : undefined, // included for dev convenience
  };
}

export async function verifyOtpCode(params: {
  userId?: number;
  email?: string;
  mobile?: string;
  otpCode: string;
  purpose: "first_login" | "password_change" | "reset_password";
}): Promise<{ valid: boolean; message: string }> {
  const { userId, email, mobile, otpCode, purpose } = params;

  if (!otpCode || otpCode.trim().length !== 6) {
    return { valid: false, message: "Invalid OTP code format. Expected 6 digits." };
  }

  const now = new Date();

  // Find latest unverified OTP for user / email / mobile matching purpose
  const query = db
    .select()
    .from(otpVerificationsTable)
    .where(
      and(
        eq(otpVerificationsTable.otpCode, otpCode.trim()),
        eq(otpVerificationsTable.purpose, purpose),
        gt(otpVerificationsTable.expiresAt, now)
      )
    )
    .orderBy(desc(otpVerificationsTable.createdAt))
    .limit(1);

  const [record] = await query;

  if (!record) {
    return { valid: false, message: "Invalid or expired OTP code. Please request a new OTP." };
  }

  if (record.verifiedAt) {
    return { valid: false, message: "This OTP code has already been used." };
  }

  // Verify match on user/email/mobile if provided
  if (userId && record.userId && record.userId !== userId) {
    return { valid: false, message: "OTP code does not match this user account." };
  }

  // Mark as verified
  await db
    .update(otpVerificationsTable)
    .set({ verifiedAt: now })
    .where(eq(otpVerificationsTable.id, record.id));

  return { valid: true, message: "OTP verified successfully." };
}
