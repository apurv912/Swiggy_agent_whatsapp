import { NextResponse } from "next/server";
import { parseTwilioWebhook, sendTwilioReply } from "@/lib/whatsapp/twilio";
import { handleIncomingMessage } from "@/lib/whatsapp/handleIncoming";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const text = await request.text();
  const formData = new URLSearchParams(text);

  const msg = parseTwilioWebhook(formData);
  if (!msg) {
    return NextResponse.json({ error: "Invalid Twilio payload" }, { status: 400 });
  }

  const reply = await handleIncomingMessage(msg);
  await sendTwilioReply(msg.from_phone, reply);

  // Twilio expects a 200 with empty TwiML if you've already sent via REST API
  return new Response("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
