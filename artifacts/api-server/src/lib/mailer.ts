import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  console.log(`[MAILER] Sending email to: ${to}, Subject: ${subject}`);
  // If SMTP environment variables are defined, we can actually send it:
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || "Sankara DRSMS"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        html
      });
      return true;
    } catch (err: any) {
      console.error("[MAILER] Error sending email:", err.message);
      return false;
    }
  }
  return true;
}

export async function sendWhatsappMessage(phone: string, text: string): Promise<boolean> {
  console.log(`[WHATSAPP] Sending message to: ${phone}, Text: ${text}`);
  return true;
}
