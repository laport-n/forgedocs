# API Gateway — Architecture

## System Purpose

Lightweight reverse proxy for external partner integrations. Validates partner API keys, applies per-partner rate limits, and forwards authenticated requests to the API service. Built with Express.

## Codemap

| Module | Path | Purpose |
|--------|------|---------|
| Proxy | `src/proxy/` | Request forwarding to API service |
| Auth | `src/auth/` | API key validation and partner lookup |
| Limits | `src/limits/` | Per-partner rate limiting |
| Logging | `src/logging/` | Structured request logging |

## Data Flow

```
Partner → Gateway → API Key Check → Rate Limit Check → Forward to API Service
                                                     → Response back to partner
```

## Invariants

| Rule | Verification |
|------|-------------|
| All forwarded requests include `X-Partner-ID` header | `grep -rn "X-Partner-ID" src/proxy/` should match |
| No direct database access — partner data loaded from config | `grep -rn "sequelize" src/` should return nothing |
