# Household Grocery Pre-Cart MVP

A local Next.js + TypeScript skeleton for a WhatsApp-style household grocery pre-cart app.

This first chunk intentionally includes only project structure and visible placeholder sections. Business logic, persistence flows, approvals, and chat parsing will come later.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` starts the local development server.
- `npm run build` creates a production build.
- `npm run start` serves the production build.
- `npm run typecheck` checks TypeScript without building.

## Project Structure

```text
app/
  layout.tsx       Global app shell
  page.tsx         Home page
  globals.css      Base styles
components/
  ChatSimulator.tsx
  FinalApprovedList.tsx
  HouseholdMembers.tsx
  PendingPreCart.tsx
  SectionPanel.tsx
data/
  requests.json    Local persisted intake requests
  seed.json        Placeholder local JSON seed data
lib/
  messageStore.ts  JSON-backed message request storage
  storage.ts       Placeholder local storage access
types/
  grocery.ts       Shared TypeScript types
```

## Message Intake API

`POST /api/messages`

```json
{
  "household_id": "h1",
  "sender_id": "aditya",
  "sender_name": "Aditya",
  "message_text": "add agarbatti",
  "channel": "web_simulator"
}
```

Stored pending requests are available at `GET /api/messages`.
