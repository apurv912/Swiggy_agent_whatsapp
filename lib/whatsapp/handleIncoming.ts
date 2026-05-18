import { mockPlaceOrder } from "@/lib/cartService";
import {
  consolidateForOrder,
  createPendingRequests,
  getPendingCountForHousehold,
} from "@/lib/messageStore";
import type { IncomingWhatsAppMessage } from "./types";

const ORDER_THRESHOLD = parseInt(process.env.ORDER_THRESHOLD ?? "5", 10);

export async function handleIncomingMessage(msg: IncomingWhatsAppMessage): Promise<string> {
  const { requests, duplicatesSkipped } = await createPendingRequests({
    household_id: msg.household_id,
    sender_id: msg.from_phone,
    sender_name: msg.from_name,
    message_text: msg.body,
    channel: "web_simulator",
  });

  if (requests.length === 0 && duplicatesSkipped === 0) {
    return "Sorry, I couldn't find any grocery items in your message. Try something like 'doodh lena' or 'bread and eggs'.";
  }

  if (requests.length === 0 && duplicatesSkipped > 0) {
    return `Already in the list! Those items are already pending for your household.`;
  }

  const itemNames = requests.map((r) => r.normalized_item).join(", ");
  const dupNote = duplicatesSkipped > 0 ? ` (${duplicatesSkipped} already in list, skipped)` : "";

  // Check if pending count has hit the threshold
  const pendingCount = await getPendingCountForHousehold(msg.household_id);

  if (pendingCount >= ORDER_THRESHOLD) {
    const orderedItems = await consolidateForOrder(msg.household_id);
    const { orderId, items } = await mockPlaceOrder(orderedItems);
    const itemList = items.map((i, idx) => `${idx + 1}. ${i}`).join("\n");
    return (
      `✅ Order placed! (${orderedItems.length} items hit the threshold of ${ORDER_THRESHOLD})\n\n` +
      `Order ID: ${orderId}\n${itemList}`
    );
  }

  return `Got it! Added: ${itemNames}${dupNote}. Cart has ${pendingCount}/${ORDER_THRESHOLD} items.`;
}
