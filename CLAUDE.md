# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run typecheck    # TypeScript check without build
npm run test         # Run tests once (Vitest)
npm run test:watch   # Watch mode
```

To run a single test file:
```bash
npx vitest run __tests__/groceryParser.test.ts
```

## Architecture

Next.js 15 (App Router) + TypeScript + React 19. Storage is JSON file-based (`data/requests.json`). AI parsing via Claude Haiku.

### Data Flow

```
WhatsApp Message (Twilio/Meta webhook)
    → lib/whatsapp/handleIncoming.ts   (shared entry point)
    → lib/groceryParser.ts             (Claude Haiku extracts items)
    → lib/messageStore.ts              (JSON persistence + deduplication)
    → Owner Approval UI (components/)
    → lib/cartService.ts               (mock order placement)
```

Web simulator (`components/ChatSimulator.tsx`) bypasses the webhook layer and POSTs directly to `/api/messages`.

### Key Modules

**`lib/groceryParser.ts`** — Calls Claude Haiku with a system prompt tuned for Indian household grocery context (Hindi/English/Hinglish). Returns `{extracted_item, normalized_item, category}[]`. Validates against a hard-coded `VALID_CATEGORIES` set and filters malformed entries.

**`lib/messageStore.ts`** — All reads/writes go through this module. Deduplication checks pending-status items only (case-insensitive, scoped to `household_id`). Auto-order fires when pending count ≥ `ORDER_THRESHOLD` (default: 5).

**`lib/whatsapp/`** — `meta.ts` handles Meta Cloud API (JSON webhook + Bearer token + GET verification handshake). `twilio.ts` handles Twilio (form-encoded POST + basic auth). Both normalize to `IncomingWhatsAppMessage` before calling `handleIncoming.ts`.

**`app/api/`** — All routes set `force-dynamic` (no caching). Mutations call `router.refresh()` on the client side.

### Data Model

Core type is `GroceryMessageRequest` in `types/grocery.ts`. Status lifecycle: `pending → approved/skipped → ordered`. The `channel` field is currently always `"web_simulator"` (WhatsApp channels extend this in Sprint 4).

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...       # Required

ORDER_THRESHOLD=5                  # Items before auto-order triggers

# Twilio (Sprint 4)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Meta Cloud API (Sprint 4)
META_WHATSAPP_ACCESS_TOKEN=...
META_WHATSAPP_PHONE_NUMBER_ID=...
META_WHATSAPP_VERIFY_TOKEN=...
```

## Testing

Tests use Vitest with `vi.mock()`. Both `fs/promises` and the Anthropic SDK are mocked — do not remove these mocks or tests will write real files and hit the live API.

Mock pattern for Anthropic SDK:
```ts
mockCreate.mockResolvedValue({
  content: [{ type: "text", text: JSON.stringify([...]) }]
});
```

## Known Constraints

- `household_id` is hardcoded to `"h1"` throughout — multi-household is not implemented
- No auth on any API route
- Seed data (`data/seed.json`) is static; household members are not editable via UI
- `cartService.ts` is a mock (logs only, no real Swiggy integration)
