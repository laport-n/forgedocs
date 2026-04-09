# Forgedocs

## What to read first
- `ARCHITECTURE.md` — system map, data flows, and verifiable invariants
- `docs/glossary.md` — domain vocabulary
- `docs/security.md` — security considerations

## Where things live
- `bin/forgedocs.mjs` — CLI entry point, all subcommands
- `lib/` — core modules (agents, instruction-gen, config, discovery, linker, installer, quickstart, health, diff, lint, export, watch, plugins, mcp-server, utils)
- `templates/` — Claude Code commands (8), skills (2), hooks (1), CI workflow (1) installed into target repos
- `.vitepress/` — VitePress config split into modules (config, discovery, rewrites, sidebar, utils)
- `scripts/` — legacy npm run scripts (thin wrappers around lib/)
- `test/` — Vitest test suite
- `extensions/vscode/` — VS Code extension (status bar, sidebar, drift warnings)
- `examples/` — sample-repo, monorepo, and forgedocs-self examples

## What to never do
- Never add runtime dependencies beyond VitePress — the tool must stay lightweight
- Never use `process.exit()` in `lib/` modules — throw errors, let the CLI handle exit
- Never hardcode org names, repo URLs, or service names in templates
- Never write to PKG_ROOT from the CLI — user data goes in CWD
- Never recurse into `content/` during discovery — those are symlinks to real repos

## How to run
- `npm test` — run all tests
- `npm run lint` — check code with Biome
- `npm run lint:fix` — auto-fix lint issues
- `npx forgedocs dev` — start the doc site locally

## When to update documentation
- Adding/removing a lib module → update `ARCHITECTURE.md` codemap + `CLAUDE.md` lib list
- New CLI subcommand → update `ARCHITECTURE.md` codemap + `README.md` CLI Reference + CLI help text + `bin/forgedocs.mjs` HELP string
- New/changed CLI flag → update `README.md` Options line + CLI help text
- New Claude command template → update `README.md` commands table + count
- New Claude skill or hook template → update `README.md` "Also installs" + `CLAUDE.md` templates line
- New MCP tool → update `README.md` MCP tools list + `ARCHITECTURE.md` data flow
- Changed discovery logic → update `ARCHITECTURE.md` data flow
- Changed feature behavior (e.g., hook trigger timing) → update `README.md` feature descriptions
- Version bump → update `CHANGELOG.md` with release notes

## Pre-push checklist
Before pushing a branch, always run through these checks:

### Documentation drift
1. Run `npx forgedocs audit .` — check for lint errors and drift
2. If drift is detected, run `/doc-sync` to fix it
3. Verify the "When to update documentation" rules above were followed for every change in the branch

### Version bump assessment
Evaluate whether the changes in the branch warrant a version bump:
- **patch** — bug fixes, doc-only changes, internal refactors with no user-facing impact
- **minor** — new features, new CLI subcommands, new templates, new MCP tools
- **major** — breaking changes to CLI interface, config format, or template structure

If a bump is needed and hasn't been done, run `/bump-version <patch|minor|major>` before pushing.

### Final verification
- `npm test` — all tests pass
- `npm run lint` — no Biome errors
- `CHANGELOG.md` — entry exists for the current version in package.json

## AI tools available (via MCP)
The forgedocs MCP server (`forgedocs mcp`) exposes these tools:
- `list_services` — list all tracked repos with doc status
- `get_service_docs` — read any doc file from a tracked service
- `search_docs` — full-text search across all documentation
- `check_freshness` — check doc freshness and staleness
- `get_health_score` — doc health score (0-100) with detailed breakdown
- `get_codemap` — ARCHITECTURE.md codemap as structured JSON
- `check_drift` — detect documentation drift vs filesystem
- `suggest_updates` — prioritized actionable suggestions for improving docs
- `query_docs` — structured queries (invariants, codemap, glossary, security rules)
- `lint_docs` — lint results for a service
