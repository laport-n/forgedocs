# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.9.0] — 2026-04-09

### Added
- **Multi-agent support** — `forgedocs install` and `quickstart` now generate instruction files for Cursor (`.cursor/rules/forgedocs.mdc`), Windsurf (`.windsurfrules`), GitHub Copilot (`.github/copilot-instructions.md`), and Cline (`.clinerules`) in addition to Claude Code (`CLAUDE.md`)
- **`forgedocs sync-agents`** — new command to regenerate all agent instruction files from current project docs; supports `--dry-run` and `--json`
- **`--agents` flag** on `install`, `quickstart`, and `sync-agents` — values: `auto` (detect, default), `all`, or comma-separated list (e.g. `claude,cursor,copilot`)
- **`lib/agents.mjs`** — agent registry with detection, conventions, capabilities, and MCP registration for 5 agents
- **`lib/instruction-gen.mjs`** — generates ~50-line navigation-first instruction files per agent from project structure (maps, not manuals)
- **MCP multi-registration** — `forgedocs install` registers the MCP server in Cursor (`.cursor/mcp.json`), Windsurf (`.windsurf/mcp.json`), and Cline (`.cline/mcp.json`) configs automatically
- **ADR 006** — documents the multi-agent design: maps not manuals, MCP as structured data layer, progressive disclosure preserved

### Changed
- **Health scoring** — `CLAUDE.md present` check renamed to `Agent instruction file present`; now awards 5 pts if ANY instruction file exists (CLAUDE.md, .cursorrules, .windsurfrules, copilot-instructions.md, .clinerules)
- **Linting** — `no-claude` rule replaced by `no-agent-instructions`; broken-ref scanning now includes all detected instruction files
- **Installer** — accepts `agents` option to control which agents to install for; defaults to auto-detection

## [0.8.1] — 2026-04-08

### Added
- **`--dry-run` flag** for `forgedocs install` — preview what would be installed without writing files
- **Lint rule 14** — detects CLI commands in ARCHITECTURE.md codemap missing from README CLI Reference table (and vice versa)
- **Lint rule 15** — detects Claude command count mismatch between README prose and actual template files
- **doc-audit skill** — expanded checklist: CLI flags, MCP tool lists, command counts, feature descriptions

### Fixed
- **settings.json hook merge** — hooks now merge into existing Bash matcher instead of creating duplicates
- **Health codemap check** — uses `parseCodemap()` for accurate validation instead of loose regex
- **Service-map freshness** — missing "Last verified" date is now a warning (0 pts) instead of silent pass (5 pts)
- **Lint glob patterns** — codemap entries like `src/**/*.controller.ts` no longer trigger false-positive broken-ref errors
- **ARCHITECTURE.md** — corrected `lib/config.mjs` description (was claiming `docsite.config.mjs` loading)
- **README drift** — fixed "after every git commit" → "after every git push", install description, plugins status, config section

## [0.8.0] — 2026-04-08

### Changed
- **Post-push doc check** — Replaced post-commit audit hook with post-push doc check hook; documentation drift warnings now trigger after `git push` instead of `git commit` (non-blocking)
- **Installer** — `forgedocs install` now appends a "Documentation maintenance" section to existing `CLAUDE.md` as a fallback for when hooks are unavailable
- **Installer migration** — Automatically removes legacy `post-commit-audit` hook entries from `.claude/settings.json` when upgrading

### Removed
- `post-commit-audit.sh` — Replaced by `post-push-doc-check.sh`

## [0.7.5] — 2026-03-28

### Added
- **`forgedocs audit`** — Alias for `check`, provides a single dev-friendly command for full documentation audit (lint + drift + score)
- **`--threshold` in CLI help** — Flag was implemented but undocumented in help text; now visible in `forgedocs --help`
- **Data Flow drift detection** (`lib/diff.mjs`) — New `parseDataFlowRefs()` function extracts backtick-wrapped file paths from the Data Flow section and verifies they exist on disk
- **Extended lint Rule 10** — Broken file reference checks now cover ARCHITECTURE.md, README.md, and CLAUDE.md (previously only `docs/` directory)
- **Lint Rule 11** — CHANGELOG freshness: warns if no entry exists for the current package.json version
- **Lint Rule 12** — Glossary placeholder detection: errors on `[To be documented]` in glossary
- **Lint Rule 13** — Security rule enforcement: if `docs/security.md` prohibits `eval()` or hardcoded credentials, grep source files for violations
- **`doc-audit` skill** (`.claude/skills/doc-audit/SKILL.md`) — Auto-triggers after code changes, checks structural and semantic drift, cross-references enumerations in docs vs code
- **Post-commit audit hook** (`.claude/hooks/post-commit-audit.sh`) — Runs `forgedocs audit` after `git commit`, warns Claude if drift detected
- **Hook installation** — `forgedocs install` now installs hooks and configures `PostToolUse` hook in `.claude/settings.json`
- **Enumeration drift detection** in `/doc-sync` and `/doc-review` templates — explicit instructions to verify that lists of CLI commands, tools, flags, and presets match the source code

### Changed
- MCP server version now read from `package.json` instead of hardcoded
- `/doc-sync` template: added CLI subcommand/flag and tool registration as doc update triggers
- `/doc-review` template: added cross-reference checks for enumerated lists in README and Data Flow accuracy
- `bump-version` skill: examples use generic `X.Y.Z` instead of hardcoded versions; added step 4.5 to verify no stale version references

### Fixed
- README.md: `--json` option was missing `lint` from supported commands list
- CLI help text: `--json` was missing `check` and `lint` from supported commands list
- ARCHITECTURE.md: Data Flow listed only 4 MCP tools instead of 10
- ARCHITECTURE.md: CLI subcommand list was missing `preview`
- ARCHITECTURE.md: Codemap descriptions for Installer, Diff, and Lint modules were outdated
- CLAUDE.md: lib/ module list was missing `lint`; templates description omitted hooks count
- `docs/adr/003-cwd-vs-pkg-root.md`: referenced `.vitepress/config.ts` instead of `.vitepress/config.mts`
- `templates/claude-commands/doc-init.md`: removed hardcoded `github.com/laport-n/forgedocs` URL (violated "never hardcode org names" rule)

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
