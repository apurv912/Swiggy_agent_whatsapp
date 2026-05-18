import type { IncomingWhatsAppMessage } from "./types";

const META_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN!;
const META_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID!;

// Meta sends deeply nested JSON — extract the first message from the payload
export function parseMetaWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  householdId = "h1"
): IncomingWhatsAppMessage | null {
  try {
    const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contact = payload?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];

    if (!message || message.type !== "text") return null;

    const fromPhone = message.from;            // "91XXXXXXXXXX" (no + prefix)
    const fromName = contact?.profile?.name ?? fromPhone;
    const body = message.text?.body?.trim();

    if (!body) return null;

    return {
      from_phone: `+${fromPhone}`,
      from_name: fromName,
      body,
      household_id: householdId,
    };
  } catch {
    return null;
  }
}

export async function sendMetaReply(to: string, message: string): Promise<void> {
  const url = `https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${META_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace("+", ""),
      type: "text",
      text: { body: message },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta send failed: ${err}`);
  }
}
