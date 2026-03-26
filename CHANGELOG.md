# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
- Configurable monorepo scan patterns (not just `apis/`)
- Windows support via file copy fallback when symlinks are unavailable
- `--force` flag for install-commands to overwrite existing files
- `--help` flag for setup and install-commands scripts
- Open-source governance files (LICENSE, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT)
- Tests for setup and install-commands scripts

### Changed
- Package name from `@themenu/docs` to `docsite`
- VitePress config reads from `docsite.config.mjs` instead of hardcoded values
- Setup script scans configurable directory patterns instead of hardcoded `apis/`
- All Swile/TheMenu branding removed — fully generic
- French section headers in templates translated to English

### Fixed
- `/doc-init` template not included in install-commands output

## [0.1.0] — 2026-03-25

### Added
- Initial release
- VitePress-based documentation viewer
- Auto-discovery of repos via `ARCHITECTURE.md` marker
- Dynamic sidebar generation from repo contents
- Symlink-based content management
- Full-text search across all services
- Hot-reload for live editing
