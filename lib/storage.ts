import seedData from "@/data/seed.json";
import type { GrocerySeedData } from "@/types/grocery";

export function getSeedData(): GrocerySeedData {
  return seedData as GrocerySeedData;
}
