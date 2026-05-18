import { SectionPanel } from "@/components/SectionPanel";
import { getAllRequests } from "@/lib/messageStore";

export async function FinalApprovedList() {
  const requests = await getAllRequests();
  const approvedRequests = requests.filter(
    (request) => request.status === "approved"
  );

  return (
    <SectionPanel
      title="Final approved list"
      tag={
        approvedRequests.length > 0
          ? `${approvedRequests.length} approved`
          : "Waiting"
      }
    >
      {approvedRequests.length > 0 ? (
        <ul className="cart-list">
          {approvedRequests.map((request) => (
            <li className="list-row" key={request.id}>
              <strong>{request.normalized_item}</strong>
              <span>{request.requester_name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          Approved grocery items will appear here after household review.
        </div>
      )}
    </SectionPanel>
  );
}
