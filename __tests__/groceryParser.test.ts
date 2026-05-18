import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

// Mock the Anthropic SDK before importing the module under test
vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

import { parseGroceryItems, getGroceryCategory } from "@/lib/groceryParser";

function mockResponse(json: object[]) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: "text", text: JSON.stringify(json) }],
    usage: { input_tokens: 10, output_tokens: 20 },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseGroceryItems", () => {
  it("extracts a single English item", async () => {
    mockResponse([{ extracted_item: "milk", normalized_item: "milk", category: "dairy" }]);
    const result = await parseGroceryItems("milk");
    expect(result).toEqual([{ extracted_item: "milk", normalized_item: "milk", category: "dairy" }]);
  });

  it("normalizes Hindi word to English", async () => {
    mockResponse([{ extracted_item: "doodh", normalized_item: "milk", category: "dairy" }]);
    const result = await parseGroceryItems("doodh khatam ho gaya");
    expect(result[0].normalized_item).toBe("milk");
    expect(result[0].extracted_item).toBe("doodh");
  });

  it("extracts multiple items from one message", async () => {
    mockResponse([
      { extracted_item: "sabun", normalized_item: "soap", category: "cleaning" },
      { extracted_item: "shampoo", normalized_item: "shampoo", category: "cleaning" },
    ]);
    const result = await parseGroceryItems("sabun aur shampoo dono lao");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.normalized_item)).toEqual(["soap", "shampoo"]);
  });

  it("strips items with invalid category", async () => {
    mockResponse([
      { extracted_item: "milk", normalized_item: "milk", category: "dairy" },
      { extracted_item: "xyz", normalized_item: "xyz", category: "invalid_category" },
    ]);
    const result = await parseGroceryItems("milk and xyz");
    expect(result).toHaveLength(1);
    expect(result[0].normalized_item).toBe("milk");
  });

  it("handles JSON wrapped in markdown fences", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "```json\n[{\"extracted_item\":\"bread\",\"normalized_item\":\"bread\",\"category\":\"other\"}]\n```" }],
      usage: { input_tokens: 10, output_tokens: 20 },
    });
    // parser should throw since it doesn't strip fences — this documents current behaviour
    await expect(parseGroceryItems("bread")).rejects.toThrow();
  });

  it("throws when API returns malformed JSON", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "not json at all" }],
      usage: { input_tokens: 10, output_tokens: 20 },
    });
    await expect(parseGroceryItems("some message")).rejects.toThrow();
  });

  it("returns empty array when model returns empty list", async () => {
    mockResponse([]);
    const result = await parseGroceryItems("ajksdhakjsdh");
    expect(result).toEqual([]);
  });

  it("handles Hinglish mixed message", async () => {
    mockResponse([
      { extracted_item: "agarbatti", normalized_item: "agarbatti", category: "puja" },
    ]);
    const result = await parseGroceryItems("kal agarbatti lena");
    expect(result[0].category).toBe("puja");
  });

  it("passes the full message text to the API", async () => {
    mockResponse([]);
    await parseGroceryItems("3 packet maggi aur ek coke 2L");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001",
        messages: [{ role: "user", content: "3 packet maggi aur ek coke 2L" }],
      })
    );
  });
});

describe("getGroceryCategory", () => {
  it.each([
    ["milk", "dairy"],
    ["paneer", "dairy"],
    ["soap", "cleaning"],
    ["detergent", "cleaning"],
    ["agarbatti", "puja"],
    ["chips", "snacks"],
    ["tomato", "cooking"],
    ["rice", "cooking"],
    ["unknown_item", "other"],
  ])("%s → %s", (item, expected) => {
    expect(getGroceryCategory(item)).toBe(expected);
  });
});
