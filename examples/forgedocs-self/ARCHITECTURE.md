# Forgedocs — Architecture

## Overview

Forgedocs is a local documentation viewer and maintenance framework. It auto-discovers repos containing `ARCHITECTURE.md`, symlinks their docs into a `content/` directory, and renders them as a unified VitePress site with dynamic navigation, sidebar, and full-text search.

## Codemap

| Module | Path | Purpose |
|--------|------|---------|
| CLI | `bin/forgedocs.mjs` | Entry point — routes subcommands (init, dev, build, add, remove, status, install, doctor, help) |
| Config | `lib/config.mjs` | Loads `docsite.config.mjs` with defaults, validates `.repos.json` |
| Discovery | `lib/discovery.mjs` | Recursive filesystem scan for repos with `ARCHITECTURE.md`, auto-detects common directories |
| Linker | `lib/linker.mjs` | Creates symlinks/junctions/copies in `content/`, with platform fallbacks |
| Installer | `lib/installer.mjs` | Copies Claude commands, skills, and CI workflows into target repos |
| Utils | `lib/utils.mjs` | `expandHome()`, `formatServiceName()`, `debug()` logging |
| VitePress Config | `.vitepress/config.ts` | Dynamic sidebar, rewrites, service discovery from `content/` symlinks |
| Templates | `templates/` | Claude Code commands, skills, and GitHub Actions workflow templates |

## Data Flow

```
forgedocs init
  → discovery.mjs scans ~/perso, ~/working, ~/projects (depth 3)
  → Interactive numbered list → user picks repos
  → Saved to .repos.json
  → linker.mjs creates symlinks in content/
  → Copies VitePress config to CWD

forgedocs dev
  → Reads .repos.json, verifies symlinks
  → Starts VitePress → config.ts scans content/ at startup
  → Builds rewrites, sidebar, nav dynamically
  → Serves on localhost:5173 with hot-reload
```

## Invariants

| Invariant | Verification |
|-----------|-------------|
| Zero runtime deps beyond VitePress | `node -e "const p=require('./package.json'); console.log(Object.keys(p.dependencies).filter(d=>d!=='vitepress').length)"` → 0 |
| No process.exit in lib/ | `grep -r "process.exit" lib/ \| wc -l` → 0 |
| CLI uses CWD for user data | `grep -c "CWD" bin/forgedocs.mjs` → > 0 |
