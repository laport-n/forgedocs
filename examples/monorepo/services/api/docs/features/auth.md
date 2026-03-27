# Feature: Authentication

## Overview

JWT-based authentication with refresh token rotation. Users authenticate via email/password, receive an access token (1h) and refresh token (7d). Refresh tokens are single-use — each refresh issues a new pair.

## Preconditions

- PostgreSQL running with users table migrated
- `JWT_SECRET` and `REFRESH_SECRET` environment variables set
- bcrypt available (native addon)

## How It Works

1. User sends `POST /api/auth/login` with `{ email, password }`
2. Server verifies password against bcrypt hash in database
3. On success: issues access token (JWT, 1h TTL) and refresh token (opaque, 7d TTL)
4. Refresh token stored in `refresh_tokens` table (hashed)
5. On refresh: old token is revoked, new pair issued (rotation)

## Invariants

| Rule | Verification |
|------|-------------|
| Login endpoint has no auth middleware | `grep -A5 "auth/login" src/routes/auth.js \| grep -v "authMiddleware"` |
| Refresh tokens are hashed before storage | `grep "bcrypt\|hash" src/services/authService.js \| grep -c "refresh"` > 0 |

## Failure Modes

- **Invalid credentials**: 401, generic message (no user enumeration)
- **Expired refresh token**: 401, user must re-login
- **Revoked refresh token**: 401 + all user sessions invalidated (potential token theft)
