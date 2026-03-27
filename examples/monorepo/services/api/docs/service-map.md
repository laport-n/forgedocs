# Service Map

Last verified: 2026-03-15

## Services

| Service | Protocol | Purpose |
|---------|----------|---------|
| **api** → **worker** | RabbitMQ | Enqueue async jobs (emails, uploads, reports) |
| **api** → **gateway** | HTTP (internal) | Validate API keys for external partners |
| **web** → **api** | HTTP (REST) | All frontend data fetching and mutations |
| **gateway** → **api** | HTTP (REST) | Forward authenticated partner requests |

## Communication diagram

```
[web] ──HTTP──→ [api] ──RabbitMQ──→ [worker]
                  ↑                     │
[gateway] ──HTTP──┘                     │
                                   [SMTP / S3]
```
