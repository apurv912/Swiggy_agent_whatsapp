import type { GroceryMessageRequest } from "@/types/grocery";

export type MockOrderResult = {
  orderId: string;
  itemCount: number;
  items: string[];
};

export async function mockPlaceOrder(items: GroceryMessageRequest[]): Promise<MockOrderResult> {
  const orderId = `ORD-${Date.now()}`;
  const itemNames = items.map((i) => i.normalized_item);

  // Simulate cart push — log and return fake confirmation
  console.log(`[MockCart] Placing order ${orderId} with ${items.length} items:`, itemNames);

  return {
    orderId,
    itemCount: items.length,
    items: itemNames,
  };
}
