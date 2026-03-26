# Architecture

## Overview

Forgedocs is a local documentation viewer and maintenance framework. It auto-discovers repos containing `ARCHITECTURE.md`, symlinks their docs into a `content/` directory, and renders them as a unified VitePress site with dynamic navigation, sidebar, and full-text search. It also provides Claude Code commands to generate and maintain documentation.

## Codemap

| Module | Path | Purpose |
|--------|------|---------|
| CLI | `bin/forgedocs.mjs` | Entry point — routes subcommands (init, dev, build, add, remove, status, install, doctor) |
| Config | `lib/config.mjs` | Loads `docsite.config.mjs` with defaults, validates `.repos.json` |
| Discovery | `lib/discovery.mjs` | Recursive filesystem scan for repos with `ARCHITECTURE.md`, auto-detects common dirs |
| Linker | `lib/linker.mjs` | Creates symlinks/junctions/copies in `content/`, with platform fallbacks |
| Installer | `lib/installer.mjs` | Copies Claude commands, skills, and CI workflows into target repos |
| Utils | `lib/utils.mjs` | `expandHome()`, `formatServiceName()`, `debug()` logging |
| VitePress Config | `.vitepress/config.ts` | Dynamic sidebar, rewrites, service discovery from `content/` symlinks |
| Templates | `templates/` | Claude Code commands, skills, and GitHub Actions workflow templates |

## Data Flow

```
User runs `forgedocs init`
  → lib/discovery.mjs scans ~/perso, ~/working, ~/projects, etc. (depth 3)
  → Presents interactive selection (numbered list)
  → User picks repos → saved to .repos.json
  → lib/linker.mjs creates symlinks: content/<name> → /path/to/repo
  → Copies .vitepress/config.ts and index.md to CWD

User runs `forgedocs dev`
  → Reads .repos.json, verifies symlinks
  → Starts VitePress dev server
  → .vitepress/config.ts scans content/ at startup:
      → Discovers services (directories/symlinks)
      → Builds URL rewrites (README.md → index.md, ARCHITECTURE.md → architecture.md)
      → Generates sidebar per service (main, guides, features, ADRs)
  → Serves on localhost:5173 with hot-reload through symlinks
```

## Architectural Invariants

| Invariant | Verification |
|-----------|-------------|
| Zero runtime dependencies beyond VitePress | `node -e "const p=require('./package.json'); const deps=Object.keys(p.dependencies||{}).filter(d=>d!=='vitepress'); console.log(deps.length)" → should be 0` |
| All lib modules are pure ESM with no side effects on import | `grep -r "process.exit" lib/ \| wc -l` → should be 0 |
| CLI uses CWD for user data, PKG_ROOT for package assets | `grep -c "PKG_ROOT" bin/forgedocs.mjs` and `grep -c "CWD" bin/forgedocs.mjs` → both > 0 |
| Templates never reference hardcoded org/repo names | `grep -r "nlaporte\|swile\|themenu" templates/ \| wc -l` → should be 0 |
| All tests pass without network access | `npm test` → exit 0 |

## Cross-Cutting Concerns

- **Platform portability**: Symlink → junction → copy fallback chain for Windows support
- **No network**: Everything runs locally, no external API calls, no telemetry
- **Progressive disclosure**: Repos need only `ARCHITECTURE.md` to appear; more files = richer sidebar
- **Fallback resilience**: Missing README.md falls back to ARCHITECTURE.md as home page; missing config uses defaults
