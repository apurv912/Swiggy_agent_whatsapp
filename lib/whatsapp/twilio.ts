import type { IncomingWhatsAppMessage } from "./types";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM!; // e.g. whatsapp:+14155238886

// Twilio sends form-encoded POST bodies
// Body: message text, From: whatsapp:+91XXXXXXXXXX, ProfileName: sender name
export function parseTwilioWebhook(
  formData: URLSearchParams,
  householdId = "h1"
): IncomingWhatsAppMessage | null {
  const body = formData.get("Body")?.trim();
  const from = formData.get("From"); // "whatsapp:+91XXXXXXXXXX"
  const profileName = formData.get("ProfileName") ?? "";

  if (!body || !from) return null;

  const fromPhone = from.replace("whatsapp:", "");

  return {
    from_phone: fromPhone,
    from_name: profileName || fromPhone,
    body,
    household_id: householdId,
  };
}

export async function sendTwilioReply(to: string, message: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const body = new URLSearchParams({
    From: TWILIO_WHATSAPP_FROM,
    To: `whatsapp:${to}`,
    Body: message,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio send failed: ${err}`);
  }
}
