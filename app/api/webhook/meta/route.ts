import { NextResponse } from "next/server";
import { parseMetaWebhook, sendMetaReply } from "@/lib/whatsapp/meta";
import { handleIncomingMessage } from "@/lib/whatsapp/handleIncoming";

export const dynamic = "force-dynamic";

// Meta requires a GET verification handshake when you register the webhook
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const payload = await request.json();

  // Acknowledge immediately — Meta requires a 200 within 20s
  // Processing happens inline here (acceptable for MVP)
  const msg = parseMetaWebhook(payload);
  if (!msg) {
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  const reply = await handleIncomingMessage(msg);
  await sendMetaReply(msg.from_phone, reply);

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
