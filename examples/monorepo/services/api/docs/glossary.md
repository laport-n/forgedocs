# Glossary

| Term | Definition |
|------|-----------|
| **Tenant** | An organization account. All users belong to exactly one tenant. Multi-tenancy is enforced at the database query level. |
| **Cart** | Temporary collection of product items before checkout. Stored in Redis with a 24h TTL. |
| **Checkout session** | A time-limited (30 min) payment flow. Created when user initiates checkout, expires if not completed. |
| **Idempotency key** | Client-provided UUID on write endpoints to prevent duplicate operations during retries. |
| **Service token** | JWT issued to internal services for inter-service communication. Short-lived (5 min), not user-scoped. |
