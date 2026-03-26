# Security

## Authentication

All requests must include a valid JWT in the `Authorization: Bearer <token>` header. Tokens are issued by the Auth Service and validated on every request by `authMiddleware`.

## Authorization

Scopes are checked per-route. A request without the required scope receives `403 Forbidden`.

## Data Protection

- All PII is encrypted at rest (AES-256)
- Database connections use TLS
- Logs never contain tokens, passwords, or PII
