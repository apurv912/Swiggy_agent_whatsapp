export type HouseholdMember = {
  id: string;
  name: string;
  role: "Owner" | "Member";
};

export type GroceryItem = {
  id: string;
  name: string;
  quantity: string;
};

export type GroceryCategory =
  | "cooking"
  | "cleaning"
  | "puja"
  | "snacks"
  | "dairy"
  | "other";

export type GroceryRequestStatus = "pending" | "approved" | "skipped" | "ordered";

export type GroceryMessageRequest = {
  id: string;
  household_id: string;
  sender_id: string;
  sender_name: string;
  requester_name: string;
  extracted_item: string;
  normalized_item: string;
  category: GroceryCategory;
  original_message: string;
  status: GroceryRequestStatus;
  created_at: string;
  channel: "web_simulator";
};

export type GroceryMessagePayload = {
  household_id: string;
  sender_id: string;
  sender_name: string;
  message_text: string;
  channel: "web_simulator";
};

export type GrocerySeedData = {
  members: HouseholdMember[];
  pendingPreCart: GroceryItem[];
  approvedList: GroceryItem[];
};
