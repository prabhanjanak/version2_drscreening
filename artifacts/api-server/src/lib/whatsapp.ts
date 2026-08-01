import { getSystemSettings, SystemConfig } from "./settings";

export async function sendWhatsappMessage(phone: string, messageText: string, otpCode?: string): Promise<boolean> {
  const settings = await getSystemSettings();

  if (!settings.whatsapp_enabled) {
    console.log(`[WHATSAPP META] WhatsApp sending is disabled in settings. Skipped for phone: ${phone}`);
    return false;
  }

  const phoneNumberId = settings.whatsapp_phone_number_id;
  const accessToken = settings.whatsapp_access_token;
  const templateName = settings.whatsapp_template_name || "drsms_otp_code";

  // Sanitize phone number (must include country code, e.g. 918951568286)
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }

  console.log(`[WHATSAPP META] Sending WhatsApp message to: ${cleanPhone}`);

  if (phoneNumberId && accessToken) {
    try {
      const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
      
      const payload = otpCode ? {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: otpCode }
              ]
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                { type: "text", text: otpCode }
              ]
            }
          ]
        }
      } : {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { body: messageText }
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data: any = await res.json();
      if (res.ok) {
        console.log(`[WHATSAPP META] Message sent successfully. Meta ID: ${data.messages?.[0]?.id}`);
        return true;
      } else {
        console.error(`[WHATSAPP META] Error response from Meta Cloud API:`, data);
        if (otpCode) {
          const textRes = await fetch(url, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: cleanPhone,
              type: "text",
              text: { body: messageText }
            }),
          });
          const textData: any = await textRes.json();
          if (textRes.ok) {
            console.log(`[WHATSAPP META] Text fallback message sent successfully. Meta ID: ${textData.messages?.[0]?.id}`);
            return true;
          }
        }
        return false;
      }
    } catch (err: any) {
      console.error("[WHATSAPP META] Error connecting to Meta API:", err.message);
      return false;
    }
  } else {
    console.warn(`[WHATSAPP META] Meta Phone Number ID or Access Token not configured in DB. Mock message to ${phone}`);
    return true;
  }
}

export async function testWhatsappConnection(config: Partial<SystemConfig>, testPhone: string): Promise<{ success: boolean; message: string }> {
  const phoneNumberId = config.whatsapp_phone_number_id;
  const accessToken = config.whatsapp_access_token;

  if (!phoneNumberId || !accessToken) {
    return { success: false, message: "Missing Meta Phone Number ID or Access Token." };
  }

  let cleanPhone = testPhone.replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { body: "Sankara DRSMS — Official WhatsApp Meta Cloud API Test Ping. Connection Verified!" }
      }),
    });

    const data: any = await res.json();
    if (res.ok) {
      return { success: true, message: `Meta WhatsApp API connection verified! Message ID: ${data.messages?.[0]?.id}` };
    } else {
      return { success: false, message: `Meta API Error: ${data.error?.message || JSON.stringify(data)}` };
    }
  } catch (err: any) {
    return { success: false, message: `Meta WhatsApp API connection failed: ${err.message}` };
  }
}
