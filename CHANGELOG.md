# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.7.0] — 2026-03-27

### Added
- **`forgedocs lint`** — Documentation linter with 10 rules: broken codemap refs, stale placeholders, placeholder invariants, empty invariants, missing invariants, ARCHITECTURE.md length, CLAUDE.md structure (4 required sections), missing README/CLAUDE/ARCHITECTURE, service-map freshness, ADR format, feature doc structure, broken file references in docs. Exits with code 1 on errors for CI integration. Supports `--json`.
- **`forgedocs check`** — Unified check command that runs lint + diff + score in one pass. Supports `--threshold <n>` to set a minimum score percentage (exits 1 if below). Ideal for CI gates.
- **`query_docs` MCP tool** — Targeted structured queries (8 types: invariants, codemap, glossary, security-rules, service-dependencies, adr-rules, feature-invariants, all-rules) returning JSON. 3-5x more token-efficient than raw markdown for AI agents.
- **`lint_docs` MCP tool** — AI agents can self-verify documentation quality via MCP.
- **PR template** — `forgedocs install` now creates `.github/PULL_REQUEST_TEMPLATE.md` with documentation checklist (ARCHITECTURE.md, ADR, security, service-map, glossary).
- **MCP auto-configuration** — `forgedocs install` auto-configures `.claude/settings.json` with the forgedocs MCP server.
- **CI lint step** — `doc-freshness.yml` template now runs `forgedocs lint` before freshness checks, surfacing errors in GitHub job summary.
- **Philosophy section** in README — Anchors project DNA in matklad's ARCHITECTURE.md and OpenAI's Harness Engineering.
- **ADR 004** — Documents matklad + Harness Engineering as architectural foundation.

### Changed
- MCP server now exposes 10 tools (was 4): added `get_health_score`, `get_codemap`, `check_drift`, `suggest_updates`, `query_docs`, `lint_docs`
- Generated CLAUDE.md template now includes example entries instead of placeholders, "When to update documentation" triggers, and MCP tools section
- Generated ARCHITECTURE.md invariants now use real example commands instead of `echo "Add verification commands"`
- Sample repo CLAUDE.md rewritten to navigation-first format
- Sample ADR rewritten from Nygard format to Forgedocs format (What/How/Rules/Trade-offs)

### Fixed
- Lint false positives on `[To be documented]` inside code blocks, backtick-quoted references, and behavioral descriptions
- Lint false positives on `file:symbol` paths (e.g., `lib/diff.mjs:parseCodemap`)
- Stale "docsite" references in templates replaced with "forgedocs"
- Unused variable in `lib/installer.mjs`

## [0.6.0] — 2026-03-26

### Added
- **`forgedocs quickstart`** — Bootstrap documentation in any repo in 30 seconds. Auto-detects tech stack, generates ARCHITECTURE.md scaffold from filesystem, creates docs/ structure, installs Claude commands. Supports `--preset` flag for stack-specific scaffolding.
- **Stack presets** (9 stacks) — `nextjs`, `react`, `fastapi`, `django`, `express`, `nestjs`, `rails`, `go`, `rust`. Each generates stack-appropriate codemap entries and data flow diagrams. Auto-detected from package.json, Cargo.toml, go.mod, Gemfile, etc.
- **`forgedocs score`** — Doc health score (0–100) per repo with detailed breakdown by category (Structure, Quality, Depth). Supports `--json` for CI integration.
- **`forgedocs badge`** — Generate SVG doc health badges for READMEs. Color-coded (green/yellow/orange/red). Output to file with `--output`.
- **`forgedocs diff`** — Drift detection without AI. Parses ARCHITECTURE.md codemap, compares with actual filesystem. Reports new directories, removed modules, undocumented entries, and lists invariants to verify. Supports `--json`.
- **`forgedocs export`** — Export docs as JSON (`forgedocs export json`) or self-contained HTML (`forgedocs export html <path>`). HTML export includes inline CSS, table of contents, and print-friendly styles.
- **`forgedocs watch`** — File watcher daemon that monitors tracked repos for changes (new directories, config file changes, doc modifications). Real-time terminal notifications with debouncing.
- **Plugin system** (`lib/plugins.mjs`) — Lightweight plugin API for extending Forgedocs. Plugins can add pages, sidebar items, and hook into discovery/build. Supports npm packages, local files, and `[name, options]` tuple config.
- **VS Code extension** (`extensions/vscode/`) — Status bar health score, sidebar documentation browser (features, ADRs, glossary), drift detection warnings, quick navigation commands. Auto-activates on `ARCHITECTURE.md` presence.
- **`plugins` config option** in `docsite.config.mjs` — Array of plugin specifiers (npm packages, local paths, or `[name, options]` tuples).

### Changed
- CLI help text updated with all new commands and options
- `--json` flag now supported on `score` and `diff` commands in addition to `status` and `doctor`

## [0.5.0] — 2026-03-26

### Added
- **MCP Server** (`forgedocs mcp`) — JSON-RPC 2.0 over stdio, zero new dependencies. Tools: `list_services`, `get_service_docs`, `search_docs`, `check_freshness`. Lets Claude query the doc site programmatically.
- **`/doc-adr`** command — standalone ADR creation with auto-numbering and codebase research
- **`/doc-pr`** command — documentation sync scoped to entire PR (`git diff main...HEAD`)
- **`--json` flag** on `status` and `doctor` commands for machine-readable output (CI/AI integration)
- **`maxDepth` config option** in `docsite.config.mjs` — configurable repo scan depth (default: 3)
- **Circular symlink detection** in linker — prevents content/ from linking back into itself
- **Debug logging** in VitePress config modules — enabled via `DEBUG` or `VERBOSE` env vars
- **Coverage reporting** in CI (Node 22, uploaded as artifact)
- **Monorepo example** (`examples/monorepo/`) — Node.js API + Python worker with `nestedDirs` config
- **Auto-fix mode** for `/doc-review` (Step 4) — optionally fix stale docs and fill gaps after audit
- README badges (npm, CI, license)
- `.repos.json` format documented in README
- Restart note after `forgedocs add`
- Community & examples sections in README
- `npx forgedocs init` as primary quick-start path

### Changed
- **VitePress config split** into modules: `discovery.ts`, `rewrites.ts`, `sidebar.ts`, `utils.ts` + slim orchestrator `config.ts`
- All empty `catch {}` blocks replaced with debug logging
- `doc-freshness.yml` template uses `python3` instead of `date -d` (cross-platform)

### Fixed
- Removed circular self-dependency (`forgedocs@^0.3.3`) in `package.json`
- Fixed `hasOwnProperty` lint warning — replaced with `Object.hasOwn()`

## [0.3.0] — 2026-03-26

### Added
- `forgedocs` CLI with subcommands: `init`, `dev`, `build`, `preview`, `add`, `remove`, `status`, `install`, `doctor`
- `forgedocs remove <name>` — remove a repo from the documentation site
- `forgedocs status` — show tracked repos with doc coverage details (features, ADRs, CLAUDE.md)
- `forgedocs doctor` — diagnose common issues (Node version, broken symlinks, missing config)
- Modular `lib/` architecture: `config.mjs`, `discovery.mjs`, `linker.mjs`, `installer.mjs`, `utils.mjs`
- Biome linter/formatter with `npm run lint` and `npm run format`
- GitHub Actions CI workflow (lint, tests on Node 18/20/22, VitePress build)
- GitHub Actions release workflow (npm publish on tag)
- GitHub issue and PR templates
- `--verbose` / `-v` flag for debug output across all commands
- `.repos.json` validation (detects corrupted/malformed config)
- Test coverage with `@vitest/coverage-v8` (`npm run test:coverage`)
- 5 new test files for lib modules (40 tests total, up from 11)
- `examples/sample-repo/` — complete example with ARCHITECTURE.md, CLAUDE.md, docs/, features/, ADRs
- TypeScript types in `.vitepress/config.ts` (replaced `any` with proper VitePress types)

### Changed
- **Renamed** from `docsite` to `forgedocs`
- Package version bumped to 0.3.0
- Scripts refactored to use shared `lib/` modules
- Repository URLs updated to `laport-n/forgedocs`
- Documentation rewritten for Forgedocs branding and CLI workflow

## [0.2.0] — 2026-03-26

### Added
- `docsite.config.mjs` — user configuration file for title, GitHub URL, scan patterns, and source exclusions
- `npm run install-commands` — installs Claude Code commands into any target repo
- `/doc-init` command — bootstraps full documentation structure on any codebase
- `/doc-feature` command — generates feature documentation from code exploration
- `/doc-sync` command — checks if docs need updating after code changes
- `/doc-review` command — full documentation audit with health report
- `/doc-onboard` command — generates onboarding reading path for new developers
- `/doc-ci` command — generates GitHub Actions workflow for doc freshness checks
- Multi-stack source exclusions (Ruby, Node, Python, Go, Rust, Java, .NET, PHP, Elixir)
- Configurable monorepo scan patterns
- Windows support via file copy fallback when symlinks are unavailable
- Open-source governance files (LICENSE, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT)
- Tests for setup and install-commands scripts

### Changed
- VitePress config reads from `docsite.config.mjs` instead of hardcoded values
- Setup script scans configurable directory patterns

## [0.1.0] — 2026-03-25

### Added
- Initial release
- VitePress-based documentation viewer
- Auto-discovery of repos via `ARCHITECTURE.md` marker
- Dynamic sidebar generation from repo contents
- Symlink-based content management
- Full-text search across all services
- Hot-reload for live editing
