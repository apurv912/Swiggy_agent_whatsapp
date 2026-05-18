import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getGroceryCategory, parseGroceryItems } from "@/lib/groceryParser";
import type {
  GroceryMessagePayload,
  GroceryMessageRequest,
  GroceryRequestStatus
} from "@/types/grocery";

const requestsFilePath = path.join(process.cwd(), "data", "requests.json");

async function ensureRequestsFile() {
  await mkdir(path.dirname(requestsFilePath), { recursive: true });

  try {
    await readFile(requestsFilePath, "utf8");
  } catch {
    await writeFile(requestsFilePath, "[]", "utf8");
  }
}

export async function getAllRequests(): Promise<GroceryMessageRequest[]> {
  await ensureRequestsFile();

  const file = await readFile(requestsFilePath, "utf8");
  const requests = JSON.parse(file) as GroceryMessageRequest[];

  return Promise.all(
    requests.map(async (request) => {
      const needsParsing = !request.extracted_item || !request.normalized_item || !request.category;
      const parsedItem = needsParsing
        ? (await parseGroceryItems(request.original_message))[0]
        : undefined;
      const extractedItem =
        request.extracted_item || parsedItem?.extracted_item || request.original_message;
      const normalizedItem =
        request.normalized_item || parsedItem?.normalized_item || extractedItem;
      const category =
        request.category || parsedItem?.category || getGroceryCategory(normalizedItem);

      return {
        ...request,
        requester_name: request.requester_name ?? request.sender_name,
        extracted_item: extractedItem,
        normalized_item: normalizedItem,
        category
      };
    })
  );
}

export async function getPendingRequests(): Promise<GroceryMessageRequest[]> {
  const requests = await getAllRequests();

  return requests.filter((request) => request.status === "pending");
}

export async function updateRequestStatuses(
  requestIds: string[],
  status: GroceryRequestStatus
): Promise<GroceryMessageRequest[]> {
  const requests = await getAllRequests();
  const requestIdSet = new Set(requestIds);
  const updatedRequests = requests.map((request) =>
    requestIdSet.has(request.id) ? { ...request, status } : request
  );

  await writeFile(
    requestsFilePath,
    JSON.stringify(updatedRequests, null, 2),
    "utf8"
  );

  return updatedRequests;
}

export async function getPendingCountForHousehold(householdId: string): Promise<number> {
  const requests = await getAllRequests();
  return requests.filter(
    (r) => r.household_id === householdId && r.status === "pending"
  ).length;
}

export async function consolidateForOrder(householdId: string): Promise<GroceryMessageRequest[]> {
  const requests = await getAllRequests();
  const pendingItems = requests.filter(
    (r) => r.household_id === householdId && r.status === "pending"
  );

  if (pendingItems.length === 0) return [];

  const pendingIds = pendingItems.map((r) => r.id);
  await updateRequestStatuses(pendingIds, "ordered");

  return pendingItems;
}

export async function createPendingRequests(
  payload: GroceryMessagePayload
): Promise<{ requests: GroceryMessageRequest[]; duplicatesSkipped: number }> {
  const requests = await getAllRequests();
  const originalMessage = payload.message_text.trim();
  const createdAt = new Date().toISOString();
  const parsedItems = await parseGroceryItems(originalMessage);

  const existingPendingItems = new Set(
    requests
      .filter((r) => r.household_id === payload.household_id && r.status === "pending")
      .map((r) => r.normalized_item.toLowerCase())
  );

  const newRequests = parsedItems
    .filter((item) => !existingPendingItems.has(item.normalized_item.toLowerCase()))
    .map((item) => ({
      id: randomUUID(),
      household_id: payload.household_id,
      sender_id: payload.sender_id,
      sender_name: payload.sender_name,
      requester_name: payload.sender_name,
      extracted_item: item.extracted_item,
      normalized_item: item.normalized_item,
      category: item.category,
      original_message: originalMessage,
      status: "pending" as const,
      created_at: createdAt,
      channel: payload.channel
    }));

  if (newRequests.length > 0) {
    await writeFile(
      requestsFilePath,
      JSON.stringify([...requests, ...newRequests], null, 2),
      "utf8"
    );
  }

  return {
    requests: newRequests,
    duplicatesSkipped: parsedItems.length - newRequests.length,
  };
}
