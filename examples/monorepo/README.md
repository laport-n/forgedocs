# Monorepo Example — Acme Store

A realistic e-commerce monorepo with 4 services demonstrating cross-service documentation, health scoring, and drift detection.

## Structure

```
monorepo/
├── services/
│   ├── api/                  ← Node.js REST API (score: 100)
│   │   ├── ARCHITECTURE.md
│   │   ├── CLAUDE.md
│   │   ├── README.md
│   │   └── docs/
│   │       ├── glossary.md
│   │       ├── security.md
│   │       ├── service-map.md
│   │       ├── features/auth.md
│   │       └── adr/001-jwt-over-sessions.md
│   ├── worker/               ← Python background worker
│   │   ├── ARCHITECTURE.md
│   │   └── README.md
│   ├── web/                  ← Next.js frontend
│   │   ├── ARCHITECTURE.md
│   │   └── README.md
│   └── gateway/              ← API gateway
│       ├── ARCHITECTURE.md
│       └── README.md
└── docsite.config.mjs
```

## Try it

```bash
cd examples/monorepo
npx forgedocs init          # discovers all 4 services
npx forgedocs status        # shows doc completeness per service
npx forgedocs score         # api=100, others lower — shows progressive improvement
npx forgedocs dev           # unified doc site
```

## What this demonstrates

- **Full-score service** (`api/`) — all doc layers filled, scores 100/100
- **Minimal services** (`worker/`, `web/`, `gateway/`) — ARCHITECTURE.md + README only, showing baseline
- **Cross-service references** — `api/docs/service-map.md` maps how services communicate
- **Progressive disclosure** — CLAUDE.md → ARCHITECTURE.md → docs/ → features/ → ADRs
- **`nestedDirs` config** — `docsite.config.mjs` tells forgedocs to scan inside `services/`

## Configuration

```js
// docsite.config.mjs
export default {
  title: 'Acme Store',
  nestedDirs: ['services'],
}
```
