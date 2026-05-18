"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionPanel } from "@/components/SectionPanel";
import type {
  GroceryCategory,
  GroceryMessageRequest,
  GroceryRequestStatus
} from "@/types/grocery";

const categoryOrder: GroceryCategory[] = [
  "cooking",
  "cleaning",
  "puja",
  "snacks",
  "dairy",
  "other"
];

const sectionLabels: Record<GroceryRequestStatus, string> = {
  pending: "Pending items",
  approved: "Approved items",
  skipped: "Skipped items",
  ordered: "Ordered items"
};

function groupRequestsByRequesterAndCategory(
  requests: GroceryMessageRequest[]
) {
  return requests.reduce<
    Map<string, Map<GroceryCategory, GroceryMessageRequest[]>>
  >((requesterGroups, request) => {
    const requesterName = request.requester_name ?? request.sender_name;
    const category = request.category ?? "other";
    const categoryGroups =
      requesterGroups.get(requesterName) ??
      new Map<GroceryCategory, GroceryMessageRequest[]>();
    const categoryRequests = categoryGroups.get(category) ?? [];

    categoryGroups.set(category, [...categoryRequests, request]);
    requesterGroups.set(requesterName, categoryGroups);

    return requesterGroups;
  }, new Map());
}

function formatCreatedTime(createdAt: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(new Date(createdAt));
}

type OwnerApprovalFlowProps = {
  initialRequests: GroceryMessageRequest[];
};

export function OwnerApprovalFlow({ initialRequests }: OwnerApprovalFlowProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(
    new Set()
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setRequests(initialRequests);
    setSelectedRequestIds((currentIds) => {
      const refreshedPendingIds = new Set(
        initialRequests
          .filter((request) => request.status === "pending")
          .map((request) => request.id)
      );

      return new Set(
        Array.from(currentIds).filter((requestId) =>
          refreshedPendingIds.has(requestId)
        )
      );
    });
  }, [initialRequests]);

  const requestsByStatus = useMemo(
    () => ({
      pending: requests.filter((request) => request.status === "pending"),
      approved: requests.filter((request) => request.status === "approved"),
      skipped: requests.filter((request) => request.status === "skipped"),
      ordered: requests.filter((request) => request.status === "ordered")
    }),
    [requests]
  );

  const selectedPendingIds = requestsByStatus.pending
    .filter((request) => selectedRequestIds.has(request.id))
    .map((request) => request.id);

  async function updateStatuses(
    requestIds: string[],
    status: GroceryRequestStatus
  ) {
    if (requestIds.length === 0) {
      return;
    }

    setError("");
    setIsUpdating(true);

    try {
      const response = await fetch("/api/messages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          request_ids: requestIds,
          status
        })
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(errorData?.error ?? "Could not update requests.");
      }

      const data = (await response.json()) as {
        requests: GroceryMessageRequest[];
      };

      setRequests(data.requests);
      setSelectedRequestIds((currentIds) => {
        const nextIds = new Set(currentIds);
        requestIds.forEach((requestId) => nextIds.delete(requestId));
        return nextIds;
      });
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update requests."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  function toggleSelectedRequest(requestId: string) {
    setSelectedRequestIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(requestId)) {
        nextIds.delete(requestId);
      } else {
        nextIds.add(requestId);
      }

      return nextIds;
    });
  }

  function renderStatusSection(status: GroceryRequestStatus) {
    const statusRequests = requestsByStatus[status];
    const groupedRequests = groupRequestsByRequesterAndCategory(statusRequests);

    return (
      <section className="approval-status-section" key={status}>
        <div className="approval-status-heading">
          <h3>{sectionLabels[status]}</h3>
          <span>{statusRequests.length} items</span>
        </div>

        {statusRequests.length > 0 ? (
          <div className="precart-groups">
            {Array.from(groupedRequests.entries()).map(
              ([requesterName, categoryGroups]) => (
                <section className="requester-group" key={requesterName}>
                  <div className="requester-heading">
                    <h4>{requesterName}</h4>
                    <span>
                      {Array.from(categoryGroups.values()).flat().length} {status}
                    </span>
                  </div>

                  {categoryOrder
                    .filter((category) => categoryGroups.has(category))
                    .map((category) => (
                      <div className="category-group" key={category}>
                        <div className="category-heading">
                          <span>{category}</span>
                          <small>
                            {categoryGroups.get(category)?.length} items
                          </small>
                        </div>

                        <ul className="precart-list">
                          {categoryGroups.get(category)?.map((request) => (
                            <li className="precart-item" key={request.id}>
                              <div className="precart-item-main">
                                <label className="approval-select">
                                  {status === "pending" ? (
                                    <input
                                      checked={selectedRequestIds.has(request.id)}
                                      disabled={isUpdating}
                                      onChange={() =>
                                        toggleSelectedRequest(request.id)
                                      }
                                      type="checkbox"
                                    />
                                  ) : null}
                                  <strong>{request.normalized_item}</strong>
                                </label>
                                <span>{request.status}</span>
                              </div>

                              <dl className="precart-meta">
                                <div>
                                  <dt>Requested by</dt>
                                  <dd>{request.requester_name}</dd>
                                </div>
                                <div>
                                  <dt>Original</dt>
                                  <dd>{request.original_message}</dd>
                                </div>
                                <div>
                                  <dt>Created</dt>
                                  <dd>{formatCreatedTime(request.created_at)}</dd>
                                </div>
                              </dl>

                              {status === "pending" ? (
                                <div className="approval-actions item-actions">
                                  <button
                                    disabled={isUpdating}
                                    onClick={() =>
                                      updateStatuses([request.id], "approved")
                                    }
                                    type="button"
                                  >
                                    Approve item
                                  </button>
                                  <button
                                    className="secondary-action"
                                    disabled={isUpdating}
                                    onClick={() =>
                                      updateStatuses([request.id], "skipped")
                                    }
                                    type="button"
                                  >
                                    Skip item
                                  </button>
                                </div>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </section>
              )
            )}
          </div>
        ) : (
          <div className="empty-state">No {status} grocery items.</div>
        )}
      </section>
    );
  }

  return (
    <SectionPanel
      title="Owner approval"
      tag={`${requestsByStatus.pending.length} pending`}
    >
      <div className="approval-toolbar">
        <button
          disabled={isUpdating || requestsByStatus.pending.length === 0}
          onClick={() =>
            updateStatuses(
              requestsByStatus.pending.map((request) => request.id),
              "approved"
            )
          }
          type="button"
        >
          Approve all
        </button>
        <button
          className="secondary-action"
          disabled={isUpdating || selectedPendingIds.length === 0}
          onClick={() => updateStatuses(selectedPendingIds, "skipped")}
          type="button"
        >
          Skip selected
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="approval-sections">
        {renderStatusSection("pending")}
        {renderStatusSection("approved")}
        {renderStatusSection("skipped")}
      </div>
    </SectionPanel>
  );
}
