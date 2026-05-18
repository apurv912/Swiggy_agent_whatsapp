import { NextResponse } from "next/server";
import {
  createPendingRequests,
  getPendingRequests,
  updateRequestStatuses
} from "@/lib/messageStore";
import type {
  GroceryMessagePayload,
  GroceryRequestStatus
} from "@/types/grocery";

export const dynamic = "force-dynamic";

function isValidPayload(body: Partial<GroceryMessagePayload>) {
  return Boolean(
    body.household_id &&
      body.sender_id &&
      body.sender_name &&
      body.message_text?.trim() &&
      body.channel === "web_simulator"
  );
}

function isValidStatus(status: unknown): status is GroceryRequestStatus {
  return status === "pending" || status === "approved" || status === "skipped";
}

export async function GET() {
  const requests = await getPendingRequests();

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<GroceryMessagePayload>;

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Missing required message fields." },
      { status: 400 }
    );
  }

  const { requests: storedRequests, duplicatesSkipped } = await createPendingRequests(body as GroceryMessagePayload);

  if (storedRequests.length === 0 && duplicatesSkipped === 0) {
    return NextResponse.json(
      { error: "No grocery items found in message." },
      { status: 422 }
    );
  }

  return NextResponse.json({ requests: storedRequests }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    request_ids?: unknown;
    status?: unknown;
  };

  if (
    !Array.isArray(body.request_ids) ||
    body.request_ids.some((requestId) => typeof requestId !== "string") ||
    !isValidStatus(body.status)
  ) {
    return NextResponse.json(
      { error: "Missing valid request IDs or status." },
      { status: 400 }
    );
  }

  const requests = await updateRequestStatuses(body.request_ids, body.status);

  return NextResponse.json({ requests });
}
