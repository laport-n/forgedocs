# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
