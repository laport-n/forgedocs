# User Authentication

## What it does

Authenticates users via email/password, issues a JWT, and manages sessions.

## How it works

1. User sends `POST /auth/login` with `{ email, password }`
2. Server validates credentials against the database
3. On success, issues a JWT with `{ sub, tenant_id, scopes, exp }`
4. Token is returned in the response body
5. Client includes the token in subsequent requests

## Invariants

- Passwords are hashed with bcrypt (cost factor 12)
- Tokens expire after 1 hour
- Failed login attempts are rate-limited (5 per minute per IP)

## Failure modes

| Scenario | Behavior |
|----------|----------|
| Invalid credentials | 401 Unauthorized, generic message |
| Rate limited | 429 Too Many Requests, retry-after header |
| Auth service down | 503 Service Unavailable |
