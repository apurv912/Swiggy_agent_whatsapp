import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock groceryParser
vi.mock("@/lib/groceryParser", () => ({
  parseGroceryItems: vi.fn(),
  getGroceryCategory: vi.fn().mockReturnValue("other"),
}));

import { readFile, writeFile } from "fs/promises";
import { parseGroceryItems } from "@/lib/groceryParser";
import { createPendingRequests, getAllRequests } from "@/lib/messageStore";
import type { GroceryMessagePayload, GroceryMessageRequest } from "@/types/grocery";

const mockReadFile = readFile as ReturnType<typeof vi.fn>;
const mockWriteFile = writeFile as ReturnType<typeof vi.fn>;
const mockParseGroceryItems = parseGroceryItems as ReturnType<typeof vi.fn>;

const BASE_PAYLOAD: GroceryMessagePayload = {
  household_id: "h1",
  sender_id: "aditya",
  sender_name: "Aditya",
  message_text: "milk please",
  channel: "web_simulator",
};

function makeStoredRequest(overrides: Partial<GroceryMessageRequest> = {}): GroceryMessageRequest {
  return {
    id: "existing-id",
    household_id: "h1",
    sender_id: "sonakshi",
    sender_name: "Sonakshi",
    requester_name: "Sonakshi",
    extracted_item: "doodh",
    normalized_item: "milk",
    category: "dairy",
    original_message: "doodh lao",
    status: "pending",
    created_at: "2026-01-01T00:00:00.000Z",
    channel: "web_simulator",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockReadFile.mockResolvedValue("[]");
  mockWriteFile.mockResolvedValue(undefined);
});

// ─── createPendingRequests ───────────────────────────────────────────────────

describe("createPendingRequests — dedup", () => {
  it("stores a new item when the list is empty", async () => {
    mockReadFile.mockResolvedValue("[]");
    mockParseGroceryItems.mockResolvedValue([
      { extracted_item: "milk", normalized_item: "milk", category: "dairy" },
    ]);

    const { requests, duplicatesSkipped } = await createPendingRequests(BASE_PAYLOAD);

    expect(requests).toHaveLength(1);
    expect(requests[0].normalized_item).toBe("milk");
    expect(duplicatesSkipped).toBe(0);
    expect(mockWriteFile).toHaveBeenCalledOnce();
  });

  it("deduplicates: same item already pending returns empty requests and skips write", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify([makeStoredRequest()]));
    mockParseGroceryItems.mockResolvedValue([
      { extracted_item: "milk", normalized_item: "milk", category: "dairy" },
    ]);

    const { requests, duplicatesSkipped } = await createPendingRequests(BASE_PAYLOAD);

    expect(requests).toHaveLength(0);
    expect(duplicatesSkipped).toBe(1);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("dedup is case-insensitive (Milk vs milk)", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify([makeStoredRequest({ normalized_item: "Milk" })]));
    mockParseGroceryItems.mockResolvedValue([
      { extracted_item: "milk", normalized_item: "milk", category: "dairy" },
    ]);

    const { requests } = await createPendingRequests(BASE_PAYLOAD);

    expect(requests).toHaveLength(0);
  });

  it("does NOT dedup across different households", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify([makeStoredRequest({ household_id: "h2" })])
    );
    mockParseGroceryItems.mockResolvedValue([
      { extracted_item: "milk", normalized_item: "milk", category: "dairy" },
    ]);

    const { requests } = await createPendingRequests(BASE_PAYLOAD); // household h1

    expect(requests).toHaveLength(1);
    expect(mockWriteFile).toHaveBeenCalledOnce();
  });

  it("does NOT dedup against approved or skipped items — only pending", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify([makeStoredRequest({ status: "approved" })])
    );
    mockParseGroceryItems.mockResolvedValue([
      { extracted_item: "milk", normalized_item: "milk", category: "dairy" },
    ]);

    const { requests } = await createPendingRequests(BASE_PAYLOAD);

    expect(requests).toHaveLength(1);
  });

  it("stores only net-new items when message has one dup and one new item", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify([makeStoredRequest()])); // milk pending
    mockParseGroceryItems.mockResolvedValue([
      { extracted_item: "doodh", normalized_item: "milk", category: "dairy" },   // dup
      { extracted_item: "bread", normalized_item: "bread", category: "other" },  // new
    ]);

    const { requests, duplicatesSkipped } = await createPendingRequests({
      ...BASE_PAYLOAD,
      message_text: "doodh aur bread",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].normalized_item).toBe("bread");
    expect(duplicatesSkipped).toBe(1);
    expect(mockWriteFile).toHaveBeenCalledOnce();
  });

  it("stores all items when none are duplicates", async () => {
    mockReadFile.mockResolvedValue("[]");
    mockParseGroceryItems.mockResolvedValue([
      { extracted_item: "soap", normalized_item: "soap", category: "cleaning" },
      { extracted_item: "shampoo", normalized_item: "shampoo", category: "cleaning" },
    ]);

    const { requests } = await createPendingRequests({
      ...BASE_PAYLOAD,
      message_text: "soap and shampoo",
    });

    expect(requests).toHaveLength(2);
  });

  it("sets correct fields on stored request", async () => {
    mockReadFile.mockResolvedValue("[]");
    mockParseGroceryItems.mockResolvedValue([
      { extracted_item: "agarbatti", normalized_item: "agarbatti", category: "puja" },
    ]);

    const { requests } = await createPendingRequests({
      ...BASE_PAYLOAD,
      message_text: "kal agarbatti lena",
      sender_name: "Maid",
      sender_id: "maid",
    });

    expect(requests[0]).toMatchObject({
      household_id: "h1",
      sender_id: "maid",
      sender_name: "Maid",
      requester_name: "Maid",
      normalized_item: "agarbatti",
      category: "puja",
      status: "pending",
      channel: "web_simulator",
    });
    expect(requests[0].id).toBeTruthy();
    expect(requests[0].created_at).toBeTruthy();
  });
});

// ─── getAllRequests ───────────────────────────────────────────────────────────

describe("getAllRequests", () => {
  it("returns empty array when file is empty", async () => {
    mockReadFile.mockResolvedValue("[]");
    const result = await getAllRequests();
    expect(result).toEqual([]);
  });

  it("returns stored requests without calling parser when fields are present", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify([makeStoredRequest()]));

    const result = await getAllRequests();

    expect(result).toHaveLength(1);
    expect(mockParseGroceryItems).not.toHaveBeenCalled();
  });

  it("falls back to parser when extracted_item is missing", async () => {
    const incomplete = makeStoredRequest({ extracted_item: "" });
    mockReadFile.mockResolvedValue(JSON.stringify([incomplete]));
    mockParseGroceryItems.mockResolvedValue([
      { extracted_item: "doodh", normalized_item: "milk", category: "dairy" },
    ]);

    const result = await getAllRequests();

    expect(mockParseGroceryItems).toHaveBeenCalledOnce();
    expect(result[0].extracted_item).toBe("doodh");
  });
});
