# 001 — Use JWT for Authentication

## Status

Accepted

## Context

We need a stateless authentication mechanism that works across multiple services without sharing session state.

## Decision

Use JSON Web Tokens (JWT) signed with RS256 for authentication. Tokens contain:
- `sub` — user ID
- `tenant_id` — tenant scope
- `scopes` — permission array
- `exp` — expiration (1 hour)

## Consequences

**Positive:**
- Stateless — no session store needed
- Each service can validate independently with the public key
- Standard format with library support in all languages

**Negative:**
- Tokens cannot be revoked before expiration (mitigated by short TTL)
- Token size grows with number of scopes (mitigated by using scope groups)
