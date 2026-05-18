import { OwnerApprovalFlow } from "@/components/OwnerApprovalFlow";
import { getAllRequests } from "@/lib/messageStore";

export async function PendingPreCart() {
  const requests = await getAllRequests();

  return <OwnerApprovalFlow initialRequests={requests} />;
}
