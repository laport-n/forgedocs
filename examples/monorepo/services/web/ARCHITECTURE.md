# Web Frontend — Architecture

## System Purpose

Next.js frontend for the Acme Store. Server-side rendered product pages, client-side cart management, and checkout flow. Communicates exclusively with the API service via REST.

## Codemap

| Module | Path | Purpose |
|--------|------|---------|
| Pages | `app/` | Next.js App Router pages |
| Shop | `app/(shop)/` | Product browsing and search |
| Checkout | `app/(checkout)/` | Cart and checkout flow |
| Components | `components/` | Shared React components |
| API Client | `lib/api/` | Fetch wrappers for API service |
| Hooks | `lib/hooks/` | Custom React hooks (useCart, useAuth) |

## Data Flow

```
Browser → Next.js Server (SSR) → API Service (REST)
       → Client (React)        → API Service (REST)
```

- Product pages: server-rendered (SSR) for SEO
- Cart state: client-side (React context + localStorage)
- Auth: JWT stored in httpOnly cookie, managed by `lib/api/client.ts`

## Invariants

| Rule | Verification |
|------|-------------|
| No direct database access — all data via API client | `grep -rn "prisma" lib/ app/` should return nothing |
| All API calls go through `lib/api/client.ts` | `grep -rn "fetch(" app/` should return nothing |
