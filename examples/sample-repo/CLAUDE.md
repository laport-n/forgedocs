# CLAUDE.md — Sample Service

## Navigation

- Start with `ARCHITECTURE.md` for system overview and invariants
- See `docs/glossary.md` for domain vocabulary
- See `docs/service-map.md` for how this service communicates with others
- See `docs/security.md` for security rules
- Feature docs are in `docs/features/`

## Conventions

- All API routes use `authMiddleware` — no exceptions
- Database queries must use parameterized queries
- Error responses follow RFC 7807 (Problem Details)
- All new features need a doc in `docs/features/`

## Anti-patterns

- Never use raw SQL — always use the query builder
- Never store secrets in environment variables without the `SECRET_` prefix
- Never skip auth middleware, even for "internal" endpoints
