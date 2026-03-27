# API Gateway

Reverse proxy for external partner integrations. Validates API keys and forwards to the API service.

## Setup

```bash
cd services/gateway
npm install
npm run dev
```

Requires the API service running at `http://localhost:3000` (configurable via `API_UPSTREAM_URL`).

## Configuration

Partner API keys are defined in `config/partners.json`:

```json
{
  "partners": [
    { "id": "acme-mobile", "key": "ak_...", "rateLimit": 500 }
  ]
}
```
