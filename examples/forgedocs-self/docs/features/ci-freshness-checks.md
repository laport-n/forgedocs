# CI Freshness Checks

## What it does

A GitHub Actions workflow (`doc-freshness.yml`) that runs on every PR and warns when code changes suggest documentation needs updating. It never blocks merges — only provides warnings in the job summary.

## How it works

The workflow is installed into target repos via `forgedocs install` (from `templates/github-workflows/doc-freshness.yml`). It runs on `pull_request` events targeting `main` or `master`.

### Checks performed

| Check | What it detects | Doc to update |
|-------|----------------|---------------|
| Module changes | New/removed directories in source root | `ARCHITECTURE.md` |
| Route changes | New/changed API endpoints or routes | `docs/service-map.md` |
| Security changes | Auth, encryption, or sensitive data modifications | `docs/security.md` |
| Staleness | `docs/service-map.md` older than 90 days | `docs/service-map.md` |

### Detection logic

1. **Auto-detects source root** — scans for `app/`, `src/`, `lib/`, `pkg/`, `internal/`, `cmd/` to find the primary source directory
2. **Compares PR diff** against known patterns (directory additions/removals, route definitions, auth middleware)
3. **Outputs warnings** to GitHub Actions job summary — visible in the PR checks tab

### Example output

```
⚠️ Documentation may need updating:

- New directory detected in src/: src/notifications/
  → Consider updating ARCHITECTURE.md codemap

- Route changes detected in src/routes/
  → Consider updating docs/service-map.md
```

## Invariants

- The workflow never blocks PRs — warnings only, never `exit 1`
- Detection is language-agnostic — uses file patterns, not AST parsing
- The workflow is self-contained — no external dependencies or API calls

## Installation

```bash
forgedocs install ~/path/to/repo
# Installs .github/workflows/doc-freshness.yml among other files
```

Or generate a customized version:
```
# In Claude Code, in your repo:
/doc-ci
```
