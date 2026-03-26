# Service Map

## Dependencies

| Service | Protocol | Purpose |
|---------|----------|---------|
| Auth Service | HTTP/REST | Token validation and user lookup |
| PostgreSQL | TCP/5432 | Primary data store |
| Redis | TCP/6379 | Session cache and rate limiting |

## Consumers

| Consumer | Protocol | What they call |
|----------|----------|---------------|
| Web Frontend | HTTP/REST | All public API endpoints |
| Mobile App | HTTP/REST | `/api/v2/*` endpoints only |
| Analytics Pipeline | Kafka | Consumes `user.events` topic |
