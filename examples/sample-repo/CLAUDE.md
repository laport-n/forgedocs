# Sample Service

## What to read first
- `ARCHITECTURE.md` — system map, codemap, data flow, verifiable invariants
- `docs/glossary.md` — domain vocabulary (Token, Tenant, Scopes, Authorization)
- `docs/security.md` — JWT handling, auth middleware, secrets management
- `docs/service-map.md` — how this service talks to Redis and external APIs

## Where things live
- `src/routes/` — Express route handlers
- `src/middleware/` — Auth middleware, error handling
- `src/models/` — Database models (query builder, not raw SQL)
- `test/` — Test suite

## What to never do
- Never skip `authMiddleware`, even for "internal" endpoints
- Never use raw SQL — always use the query builder
- Never store secrets without the `SECRET_` prefix
- Never return errors without RFC 7807 format (Problem Details)

## How to run
- `npm test` — run all tests
- `npm run dev` — start dev server
- `npm run lint` — check code style

## When to update documentation
- Adding/removing a route → update `ARCHITECTURE.md` codemap
- New auth mechanism → update `docs/security.md`
- New external dependency → update `docs/service-map.md`
- New domain concept → update `docs/glossary.md`
- New complex feature → create `docs/features/<name>.md`
