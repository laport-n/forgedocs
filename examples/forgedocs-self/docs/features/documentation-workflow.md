# Documentation Workflow

## What it does

Forgedocs defines a complete documentation lifecycle — from initial bootstrapping to ongoing maintenance — using layered docs and automated checks.

## Progressive disclosure model

Each layer is progressively more detailed and less stable:

```
CLAUDE.md          ← Entry point for AI agents. "Where to look". ~50 lines.
    ↓
ARCHITECTURE.md    ← The map. Codemap, data flow, verifiable invariants. ~100-150 lines.
    ↓
docs/              ← Reference library. Glossary, security, service map, ADRs.
    ↓
docs/features/     ← Deep dives. Complex features with invariants and failure modes.
    ↓
code               ← The ultimate source of truth.
```

## Lifecycle

### Initial setup

1. Install forgedocs globally: `npm install -g forgedocs`
2. Run `forgedocs install ~/path/to/repo` to install Claude Code commands
3. Open Claude Code in the repo and run `/doc-init`
4. Claude explores the codebase and generates: README.md, ARCHITECTURE.md, CLAUDE.md, docs/ (glossary, security, service-map, ADRs)
5. Run `forgedocs init` to add the repo to the documentation site

### Day-to-day maintenance

| Trigger | Action | Tool |
|---------|--------|------|
| Every PR | PR template checklist reminds to update docs | Automatic |
| Every PR | CI workflow warns if structural changes lack doc updates | `doc-freshness.yml` |
| After code changes | Check if docs need updating | `/doc-sync` |
| New complex feature | Generate feature documentation | `/doc-feature` |
| Quarterly | Full documentation audit with invariant checks | `/doc-review` |
| New team member | Generate personalized reading path | `/doc-onboard` |

### What stays stable

| Document | Change frequency | Why |
|----------|-----------------|-----|
| `docs/glossary.md` | Almost never | Domain vocabulary is stable |
| `docs/adr/` | Only additions | ADRs are immutable |
| `CLAUDE.md` | When directory structure changes | Points to directories, not files |
| `ARCHITECTURE.md` | A few times per year | High-level map, not detailed docs |
| `docs/features/` | When feature behavior changes | Invariants are stable by design |

## Invariants

- Docs live in repos, not in wikis — they're reviewed with the code in PRs
- `CLAUDE.md` is navigation-first, not description-first
- Each invariant in `ARCHITECTURE.md` has a verification command
- Feature docs are on-demand via `/doc-feature`, not required for every feature
- The doc site is a viewer, not a source of truth — it symlinks to real repos
