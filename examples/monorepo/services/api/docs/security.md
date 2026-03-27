# Security

## Authentication
- All endpoints require JWT bearer token except `/health` and `/api/auth/login`
- Tokens expire after 1 hour, refresh tokens after 7 days
- Passwords hashed with bcrypt (cost factor 12)

## Authorization
- Tenant isolation enforced at query level — every DB query includes `tenant_id`
- Admin endpoints require `role: admin` in JWT claims
- Service-to-service calls use short-lived service tokens (5 min TTL)

## Input validation
- All request bodies validated against JSON Schema before reaching handlers
- File uploads limited to 10 MB, restricted to allowed MIME types
- SQL injection prevented by parameterized queries (Sequelize)

## Rate limiting
- Public endpoints: 100 req/min per IP
- Authenticated endpoints: 1000 req/min per user
- Login endpoint: 5 attempts/min per IP (brute-force protection)
