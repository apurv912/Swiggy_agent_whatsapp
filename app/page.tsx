import { ChatSimulator } from "@/components/ChatSimulator";
import { FinalApprovedList } from "@/components/FinalApprovedList";
import { HouseholdMembers } from "@/components/HouseholdMembers";
import { PendingPreCart } from "@/components/PendingPreCart";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Household Grocery Pre-Cart MVP</p>
          <h1>WhatsApp-style grocery planning for shared households</h1>
        </div>
        <div className="status-pill">Chunk 0 Skeleton</div>
      </header>

      <section className="workspace-grid" aria-label="MVP placeholder workspace">
        <ChatSimulator />
        <HouseholdMembers />
        <PendingPreCart />
        <FinalApprovedList />
      </section>
    </main>
  );
}
