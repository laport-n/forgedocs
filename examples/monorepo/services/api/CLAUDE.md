# API Service

## What to read first
- `ARCHITECTURE.md` — codemap, data flow, verifiable invariants
- `docs/glossary.md` — domain terms (tenant, cart, checkout session)
- `docs/security.md` — auth rules, rate limiting, input validation

## Where things live
- `src/routes/` — Express route handlers (users, auth, orders, products)
- `src/middleware/` — Auth, rate limiting, validation, error handling
- `src/services/` — Business logic layer
- `src/db/` — Sequelize models and migrations

## What to never do
- Never skip auth middleware on new routes (except `/health`)
- Never return raw database errors to clients
- Never store plaintext passwords — bcrypt only
- Never bypass rate limiting in production

## How to run
- `npm run dev` — start with hot-reload
- `npm test` — run test suite
- `npm run migrate` — run pending migrations
