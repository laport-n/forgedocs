# API Service — Architecture

## System Purpose

REST API serving the platform's frontend and mobile clients. Handles authentication, user management, and proxies requests to internal services.

## Codemap

| Module | Path | Purpose |
|--------|------|---------|
| Routes | `src/routes/` | Express route handlers (users, auth, orders, products) |
| Middleware | `src/middleware/` | Auth, rate limiting, validation, error handling |
| Services | `src/services/` | Business logic layer |
| Database | `src/db/` | Sequelize models and migrations |

## Data Flow

```
Client → Express Router → Middleware → Route Handler → Service → Database
                                                    → Worker (via message queue)
```

## Invariants

| Rule | Verification |
|------|-------------|
| All routes require auth middleware except `/health` | `grep -rL "authMiddleware" src/routes/` should only list health route |
| Database queries use parameterized statements | `grep -rn "raw(" src/db/` should return nothing |
