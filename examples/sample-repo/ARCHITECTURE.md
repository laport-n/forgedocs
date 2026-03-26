# Sample Service — Architecture

## System Overview

This is a sample repository demonstrating the documentation structure expected by Docforge.

## Codemap

| Component | Path | Purpose |
|-----------|------|---------|
| API Server | `src/server.js` | HTTP API entry point |
| Database | `src/db.js` | PostgreSQL connection |
| Auth | `src/auth.js` | JWT authentication |

## Data Flow

```
Client -> API Server -> Auth middleware -> Route handler -> Database
                                                        -> Response
```

## Verifiable Invariants

| Rule | Check |
|------|-------|
| All routes require auth | `grep -rn 'router\.' src/routes/ \| grep -v authMiddleware \| wc -l` should be 0 |
| No raw SQL queries | `grep -rn 'query(' src/ \| grep -v parameterized \| wc -l` should be 0 |
