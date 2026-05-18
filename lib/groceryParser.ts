import Anthropic from "@anthropic-ai/sdk";
import type { GroceryCategory } from "@/types/grocery";

export type ParsedGroceryItem = {
  extracted_item: string;
  normalized_item: string;
  category: GroceryCategory;
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a grocery item extractor for an Indian household WhatsApp bot.
Extract all grocery items from the message. The message may be in Hindi, English, or a mix.

Return a JSON array. Each element must have:
- extracted_item: the original word/phrase used in the message
- normalized_item: normalized English name (e.g. "doodh" → "milk", "agarbatti" → "agarbatti")
- category: one of exactly these values: "cooking", "cleaning", "puja", "snacks", "dairy", "other"

Return ONLY valid JSON. No explanation. No markdown fences.
Example: [{"extracted_item":"doodh","normalized_item":"milk","category":"dairy"}]`;

const VALID_CATEGORIES = new Set<GroceryCategory>([
  "cooking", "cleaning", "puja", "snacks", "dairy", "other"
]);

function isValidCategory(value: unknown): value is GroceryCategory {
  return typeof value === "string" && VALID_CATEGORIES.has(value as GroceryCategory);
}

export async function parseGroceryItems(messageText: string): Promise<ParsedGroceryItem[]> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: messageText }],
  });

  const raw = (response.content[0] as { type: "text"; text: string }).text.trim();
  const parsed = JSON.parse(raw) as unknown[];

  return parsed
    .filter(
      (item): item is ParsedGroceryItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).extracted_item === "string" &&
        typeof (item as Record<string, unknown>).normalized_item === "string" &&
        isValidCategory((item as Record<string, unknown>).category)
    )
    .map((item) => ({
      extracted_item: item.extracted_item,
      normalized_item: item.normalized_item,
      category: item.category,
    }));
}

export function getGroceryCategory(normalizedItem: string): GroceryCategory {
  const categoryMap: Record<string, GroceryCategory> = {
    milk: "dairy", curd: "dairy", paneer: "dairy", butter: "dairy", ghee: "dairy",
    tomato: "cooking", onion: "cooking", potato: "cooking", rice: "cooking",
    flour: "cooking", oil: "cooking", sugar: "cooking", salt: "cooking",
    agarbatti: "puja",
    chips: "snacks", biscuits: "snacks", chocolate: "snacks",
    soap: "cleaning", detergent: "cleaning", shampoo: "cleaning",
  };
  return categoryMap[normalizedItem.toLowerCase()] ?? "other";
}
