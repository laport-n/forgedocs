# Forgedocs — Self-Documentation Example

> **This example is now the real thing.** Forgedocs documents itself using its own tools.

The live documentation site at [laport-n.github.io/forgedocs](https://laport-n.github.io/forgedocs/) is built directly from the repository root's documentation files:

- `/ARCHITECTURE.md` — System map with 20 modules, data flows, verifiable invariants
- `/CLAUDE.md` — AI agent entry point
- `/README.md` — Project overview and CLI reference
- `/docs/glossary.md` — Domain vocabulary (11 terms)
- `/docs/security.md` — Security rules and threat model
- `/docs/service-map.md` — Dependencies, consumers, communication diagram
- `/docs/features/` — Feature deep-dives (quickstart, health-score, drift-detection, export)
- `/docs/adr/` — Architecture Decision Records (3 ADRs)

## How it works

The GitHub Pages workflow (`.github/workflows/pages.yml`) copies the real docs from the repo root into the VitePress `content/` directory at build time. No stale copies — the site always reflects the current state of the code.

## Verify it yourself

```bash
# From the repo root:
npx forgedocs score .     # should be 100/100
npx forgedocs diff .      # should show 0 drift
```

## For other examples

- [`../sample-repo/`](../sample-repo/) — Minimal single-service documentation structure
- [`../monorepo/`](../monorepo/) — Multi-service documentation with Node.js + Python
