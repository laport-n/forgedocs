# Web Frontend

Next.js e-commerce frontend for the Acme Store.

## Setup

```bash
cd services/web
npm install
npm run dev
```

Requires the API service running at `http://localhost:3000` (configurable via `NEXT_PUBLIC_API_URL`).

## Key pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with featured products |
| `/products` | Product listing with search and filters |
| `/products/[slug]` | Product detail page (SSR) |
| `/cart` | Shopping cart |
| `/checkout` | Checkout flow |
