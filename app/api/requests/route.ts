import { NextResponse } from "next/server";
import { getAllRequests } from "@/lib/messageStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const requests = await getAllRequests();

  return NextResponse.json({ requests });
}
