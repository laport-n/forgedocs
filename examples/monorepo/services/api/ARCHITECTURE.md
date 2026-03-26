# API Service — Architecture

## System Purpose

REST API serving the platform's frontend and mobile clients. Handles authentication, user management, and proxies requests to internal services.

## Codemap

| Module | Purpose | Key files |
|--------|---------|-----------|
| `src/routes/` | Express route handlers | `users.js`, `auth.js` |
| `src/middleware/` | Auth, rate limiting, validation | `auth.js`, `rateLimit.js` |
| `src/services/` | Business logic | `userService.js` |
| `src/db/` | Database access layer | `models/`, `migrations/` |

## Data Flow

```
Client → Express Router → Middleware → Route Handler → Service → Database
                                                    → Worker (via message queue)
```

## Invariants

| Rule | Verification |
|------|-------------|
| All routes require auth middleware except `/health` | `grep -r "router\." src/routes/ \| grep -v auth \| grep -v health` |
| Database queries use parameterized statements | `grep -rn "query(" src/db/ \| grep -v "\$"` should return nothing |
