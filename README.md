# Household Grocery Agent — WhatsApp × Swiggy

> An AI agent that converts scattered WhatsApp grocery requests from family members into a structured, owner-reviewed pre-cart — ready to order on Swiggy Instamart in one tap.

---

## The Problem

In a shared Indian household, groceries get requested by many people across many moments — a voice note from mom, a Hindi text from the maid, a quick message from your partner. These land in different WhatsApp threads, often in mixed Hindi-English, with no structure.

The result: someone (usually the owner) spends 10–15 minutes every few days manually consolidating requests, removing duplicates, ignoring the kid's fourth chocolate request, and then placing the order. This is repetitive, low-value coordination work.

This agent eliminates that coordination layer entirely.

---

## What the Agent Does

The agent acts as a **persistent household grocery coordinator**. It listens, understands, deduplicates, and curates — so the owner only needs to make the final decision on what to order.

**The loop:**

```
1. LISTEN       Any household member texts a grocery request on WhatsApp
                (Hindi, English, or Hinglish — "doodh lena", "get some agarbatti")
                   ↓
2. PARSE        Claude Haiku extracts and normalizes items from natural language
                "doodh" → milk (dairy) | "agarbatti" → agarbatti (puja)
                   ↓
3. DEDUPLICATE  Agent checks the pre-cart. If milk is already pending, it skips it
                and tells the sender — no duplicate entries, no manual cleanup
                   ↓
4. ACCUMULATE   Items land in the household pre-cart, grouped by who asked
                and what category (cooking / dairy / cleaning / puja / snacks)
                   ↓
5. OWNER REVIEWS  When ready, the owner opens the approval UI
                  Sees all requests — grouped by person, then by category
                  Approves what makes sense, skips what doesn't
                  (e.g., skips the kid's chocolate request)
                   ↓
6. ORDER        Approved pre-cart goes to Swiggy Instamart [→ Sprint 5]
```

The agent handles steps 1–4 fully autonomously. Step 5 is a deliberate human-in-the-loop checkpoint — the owner controls what actually gets ordered.

---

## Why Human-in-the-Loop (Design Decision)

Fully autonomous grocery ordering sounds appealing but breaks trust fast. If the agent auto-orders the wrong thing or misses context ("we don't need oil, we just bought it"), the household loses confidence in the system.

The design philosophy here: **agent does 90% of the cognitive work, owner keeps the final say.** The owner goes from manually collecting 15 requests → to reviewing a clean, categorized list and tapping "Approve all." That's the right tradeoff for a household setting.

Future sprints will introduce optional auto-approval rules for recurring staples (e.g., always approve milk and bread) while keeping the review layer for everything else.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| AI / NLP Agent | Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) |
| WhatsApp Channels | Twilio WhatsApp API + Meta Cloud API (dual-provider support) |
| Storage | JSON file (MVP) → PostgreSQL planned |
| Testing | Vitest, mocked Anthropic SDK + fs |
| Deployment Target | Vercel |

---

## Current Build (MVP)

**Working:**
- ✅ WhatsApp webhook handlers — Twilio and Meta Cloud API
- ✅ Claude-powered NLP: any language/mix → structured item + category
- ✅ Smart deduplication: case-insensitive, per-household, pending-only scope
- ✅ Owner approval UI — grouped by requester + category, approve/skip per item or bulk
- ✅ Pre-cart state management across all household members
- ✅ Web simulator for local testing (no WhatsApp needed)
- ✅ Unit tests for parser and message store

**Mocked / stubbed:**
- 🔶 Swiggy order placement (`mockPlaceOrder` — logs and returns fake order ID)
- 🔶 Household registry (hardcoded to `h1`, phone → household mapping not yet built)

---

## Planned Swiggy Integration

The `cartService.ts` module is the integration seam. Replacing the mock with real Swiggy calls:

1. **Auth** — Swiggy Partner / Instamart API credentials
2. **Item Mapping** — `normalized_item` → Swiggy SKU (lookup table + fuzzy catalogue search)
3. **Cart API** — Push approved items with quantities to Swiggy cart
4. **Checkout** — Trigger with household's saved address and payment method
5. **Tracking** — Webhook/polling for delivery status → WhatsApp reply with ETA

Everything else in the agent (parsing, deduplication, approval flow) stays unchanged. Swiggy is just the fulfillment layer at the end of the pipeline.

---

## Vision: From Grocery Agent → Household Intelligence Layer

Groceries are the first use case. The deeper opportunity is what the agent learns over time from every request, approval, and skip.

**Sprint 6 — Spend Intelligence**
- Monthly and weekly spend tracking per household
- Category breakdown: how much goes to dairy vs. snacks vs. cooking
- Flagging spend spikes ("you've ordered 3x more snacks than usual this week")
- Owner gets a weekly digest on WhatsApp — no app needed

**Sprint 7 — Household Rules Engine**
- Per-member ordering limits and category restrictions
- Example: Kid's requests in the `snacks` category get flagged for approval instead of auto-queued
- Recurring staples (milk, bread) get auto-approved — skip the review step for known items
- Budget caps per category per month

**Sprint 8 — Proactive Agent Behaviour**
- Agent notices milk hasn't been requested in 5 days → sends a nudge
- Seasonal item suggestions based on past order history
- Identifies items frequently requested together → bundle suggestions

**Sprint 9 — Multi-Modal Input**
- Voice note transcription → grocery extraction
- Photo of empty shelf or handwritten list → item extraction

The goal: a household agent that knows your household's consumption patterns better than any individual member does, and acts proactively — not just reactively.

---

## Roadmap Summary

| Sprint | Focus |
|---|---|
| ✅ MVP | WhatsApp intake, Claude parsing, pre-cart, approval UI |
| 5 | Swiggy Instamart API integration |
| 5 | PostgreSQL persistence, multi-household support |
| 6 | Spend analytics, weekly digest on WhatsApp |
| 7 | Household rules engine, per-member controls, auto-approval for staples |
| 8 | Proactive restocking nudges, pattern detection |
| 9 | Voice + image input (multimodal) |

---

## Local Setup

```bash
git clone https://github.com/apurv912/Swiggy_agent_whatsapp.git
cd Swiggy_agent_whatsapp
npm install
```

Create `.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# or Meta Cloud API
META_WHATSAPP_ACCESS_TOKEN=...
META_WHATSAPP_PHONE_NUMBER_ID=...
META_WHATSAPP_VERIFY_TOKEN=...
```

```bash
npm run dev       # http://localhost:3000
npm run test      # Unit tests
npm run typecheck # TypeScript check
```

---

## Built By

**Apurv Adarsh** — Product Manager exploring AI-native household automation and agentic product design.
