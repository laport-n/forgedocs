# ADR-001: JWT over Server-Side Sessions

## Status

Accepted — 2026-01-10

## Context

The API needs to authenticate requests from the web frontend, mobile apps, and partner integrations via the gateway. Server-side sessions require sticky sessions or a shared session store, adding infrastructure complexity.

## Decision

Use JWT access tokens (stateless, 1h TTL) with rotating refresh tokens (stateful, 7d TTL) stored in PostgreSQL.

## Consequences

- **Pro**: No shared session store needed — any API instance can validate tokens
- **Pro**: Mobile and partner clients don't need cookie support
- **Pro**: Refresh rotation detects token theft (reuse triggers full revocation)
- **Con**: Tokens cannot be revoked before expiry (mitigated by short 1h TTL)
- **Con**: JWT payload size is larger than a session ID cookie

## Rules

- Access tokens must have a maximum TTL of 1 hour
- Refresh tokens must be single-use — rotation on every refresh
- Reuse of a revoked refresh token must invalidate all sessions for that user
- Never store JWTs in localStorage — use httpOnly cookies on web, secure storage on mobile
