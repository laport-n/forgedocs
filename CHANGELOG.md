# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] — 2026-03-26

### Added
- `docforge` CLI with subcommands: `init`, `dev`, `build`, `preview`, `add`, `remove`, `status`, `install`, `doctor`
- `docforge remove <name>` — remove a repo from the documentation site
- `docforge status` — show tracked repos with doc coverage details (features, ADRs, CLAUDE.md)
- `docforge doctor` — diagnose common issues (Node version, broken symlinks, missing config)
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
- Repository URLs updated to `nlaporte/docforge`
- Documentation rewritten for Docforge branding and CLI workflow

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
