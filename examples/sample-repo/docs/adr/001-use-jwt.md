# 001 — Use JWT for Authentication

**Status:** Accepted
**Date:** 2026-01-15

## What

JSON Web Tokens (JWT) signed with RS256 for stateless authentication across services. Tokens contain `sub` (user ID), `tenant_id`, `scopes` (permission array), and `exp` (1 hour TTL).

## How it works

Each service validates tokens independently using the shared public key. The `authMiddleware` in `src/middleware/auth.js` extracts the JWT from the `Authorization: Bearer` header, verifies the signature, and attaches the decoded payload to `req.user`. No session store, no shared state.

## Rules

- All routes must use `authMiddleware` — no exceptions, even for "internal" endpoints
<!-- check: grep -rL "authMiddleware" src/routes/ | wc -l → should be 0 -->
- Tokens are validated on every request, never cached
- Token expiration is 1 hour — never increase beyond that
- Use `scopes` for authorization, never role strings

## Trade-offs

- Stateless: no session store needed, each service validates independently
- Tokens cannot be revoked before expiration (mitigated by short 1h TTL)
- Token size grows with scopes (mitigated by scope groups)
- Public key must be distributed to all services
