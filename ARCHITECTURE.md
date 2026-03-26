# Architecture

## Overview

Forgedocs is a local documentation viewer and maintenance framework. It auto-discovers repos containing `ARCHITECTURE.md`, symlinks their docs into a `content/` directory, and renders them as a unified VitePress site with dynamic navigation, sidebar, and full-text search. It also provides Claude Code commands to generate and maintain documentation.

## Codemap

| Module | Path | Purpose |
|--------|------|---------|
| CLI | `bin/forgedocs.mjs` | Entry point — routes subcommands (init, quickstart, dev, build, add, remove, status, score, badge, diff, export, watch, install, doctor, mcp) |
| Config | `lib/config.mjs` | Loads `docsite.config.mjs` with defaults (incl. plugins), validates `.repos.json` |
| Discovery | `lib/discovery.mjs` | Recursive filesystem scan for repos with `ARCHITECTURE.md`, auto-detects common dirs |
| Linker | `lib/linker.mjs` | Creates symlinks/junctions/copies in `content/`, with circular symlink detection |
| Installer | `lib/installer.mjs` | Copies Claude commands, skills, and CI workflows into target repos |
| Quickstart | `lib/quickstart.mjs` | Stack detection, scaffold generation (ARCHITECTURE.md, docs/), preset support (9 stacks) |
| Health | `lib/health.mjs` | Doc health score calculation (0–100), SVG badge generation, terminal report formatting |
| Diff | `lib/diff.mjs` | Drift detection — parses ARCHITECTURE.md codemap/invariants, compares with filesystem |
| Export | `lib/export.mjs` | Export docs as JSON or self-contained HTML (with inline CSS and markdown-to-HTML conversion) |
| Watch | `lib/watch.mjs` | File watcher daemon using `fs.watch` — detects directory/config/doc changes across repos |
| Plugins | `lib/plugins.mjs` | Lightweight plugin system — hooks for pages, sidebar items, discovery, and build |
| MCP Server | `lib/mcp-server.mjs` | JSON-RPC 2.0 over stdio — exposes doc search, read, and freshness tools for AI agents |
| Utils | `lib/utils.mjs` | `expandHome()`, `formatServiceName()`, `debug()` logging |
| VitePress Discovery | `.vitepress/discovery.ts` | Discovers services from `content/` symlinks, resolves allowed dirs |
| VitePress Rewrites | `.vitepress/rewrites.ts` | Generates URL rewrites (README.md → index.md, etc.) |
| VitePress Sidebar | `.vitepress/sidebar.ts` | Dynamic sidebar generation per service (main, guides, features, ADRs) |
| VitePress Utils | `.vitepress/utils.ts` | Shared helpers: `debug()`, `formatServiceName()` |
| VitePress Config | `.vitepress/config.ts` | Orchestrator — imports modules above, defines VitePress config |
| Templates | `templates/` | Claude Code commands (8), skills, and GitHub Actions workflow templates |
| VS Code Extension | `extensions/vscode/` | Status bar health score, sidebar doc browser, drift detection, quick navigation |

## Data Flow

```
User runs `forgedocs init`
  → lib/discovery.mjs scans ~/perso, ~/working, ~/projects, etc. (configurable maxDepth)
  → Presents interactive selection (numbered list)
  → User picks repos → saved to .repos.json
  → lib/linker.mjs creates symlinks: content/<name> → /path/to/repo (with circular detection)
  → Copies .vitepress/config.ts and index.md to CWD

User runs `forgedocs dev`
  → Reads .repos.json, verifies symlinks
  → Starts VitePress dev server
  → .vitepress/config.ts orchestrates:
      → discovery.ts discovers services from content/ symlinks
      → rewrites.ts generates URL rewrites (README.md → index.md, etc.)
      → sidebar.ts generates sidebar per service (main, guides, features, ADRs)
  → Serves on localhost:5173 with hot-reload through symlinks

User runs `forgedocs mcp`
  → lib/mcp-server.mjs starts JSON-RPC 2.0 server on stdio
  → Reads .repos.json, exposes tools: list_services, get_service_docs, search_docs, check_freshness
  → Claude Code queries docs programmatically during coding sessions
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
