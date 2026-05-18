"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionPanel } from "@/components/SectionPanel";
import type {
  GroceryMessagePayload,
  GroceryMessageRequest
} from "@/types/grocery";

const householdMembers = [
  { id: "aditya", name: "Aditya" },
  { id: "sonakshi", name: "Sonakshi" },
  { id: "maid", name: "Maid" },
  { id: "kid", name: "Kid" },
  { id: "roommate", name: "Roommate" }
];

export function ChatSimulator() {
  const router = useRouter();
  const [selectedMemberId, setSelectedMemberId] = useState(householdMembers[0].id);
  const [messageText, setMessageText] = useState("");
  const [requests, setRequests] = useState<GroceryMessageRequest[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  async function loadRequests() {
    const response = await fetch("/api/messages", { cache: "no-store" });
    const data = (await response.json()) as { requests: GroceryMessageRequest[] };
    setRequests(data.requests);
  }

  useEffect(() => {
    loadRequests().catch(() => {
      setError("Could not load pending requests.");
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const selectedMember = householdMembers.find(
      (member) => member.id === selectedMemberId
    );

    if (!selectedMember || !messageText.trim()) {
      return;
    }

    const payload: GroceryMessagePayload = {
      household_id: "h1",
      sender_id: selectedMember.id,
      sender_name: selectedMember.name,
      message_text: messageText,
      channel: "web_simulator"
    };

    setIsSending(true);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(errorData?.error ?? "Message intake failed.");
      }

      const data = (await response.json()) as {
        requests: GroceryMessageRequest[];
      };
      setRequests((currentRequests) => [...currentRequests, ...data.requests]);
      setMessageText("");
      router.refresh();
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Could not send message."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <SectionPanel title="Chat simulator" tag="Message intake" tall>
      <form className="intake-form" onSubmit={handleSubmit}>
        <label>
          Member
          <select
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
          >
            {householdMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Grocery request
          <textarea
            placeholder="add agarbatti"
            rows={4}
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
          />
        </label>

        <button
          className="primary-button"
          disabled={isSending || !messageText.trim()}
          type="submit"
        >
          {isSending ? "Sending..." : "Send message"}
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="raw-requests">
        <h3>Raw pending requests</h3>
        {requests.length > 0 ? (
          <ul className="request-list">
            {requests.map((request) => (
              <li className="request-card" key={request.id}>
                <div>
                  <strong>{request.requester_name ?? request.sender_name}</strong>
                  <span>{request.status}</span>
                </div>
                {request.normalized_item ? (
                  <p>
                    {request.normalized_item}
                    {request.extracted_item !== request.normalized_item
                      ? ` (${request.extracted_item})`
                      : ""}
                  </p>
                ) : null}
                <p>{request.original_message}</p>
                <time>{new Date(request.created_at).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">No pending requests yet.</div>
        )}
      </div>
    </SectionPanel>
  );
}
