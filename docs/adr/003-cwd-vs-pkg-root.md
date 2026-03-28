# 003 — CWD for User Data, PKG_ROOT for Package Assets

**Status:** Accepted
**Date:** 2026-03-26

## What

When installed globally, the CLI distinguishes between `PKG_ROOT` (where forgedocs is installed) and `CWD` (where the user runs commands). User data goes in CWD, package assets come from PKG_ROOT.

## How it works

In `bin/forgedocs.mjs`:
- `PKG_ROOT = path.dirname(path.dirname(import.meta.url))` — the npm install location
- `CWD = process.cwd()` — the user's working directory

| Data | Location | Why |
|------|----------|-----|
| `.repos.json` | CWD | User-specific repo list |
| `content/` | CWD | Symlinks to user's repos |
| `docsite.config.mjs` | CWD | User's site config |
| `.vitepress/config.mts` | CWD (copied from PKG_ROOT) | VitePress needs it in the site root |
| `templates/` | PKG_ROOT | Shipped with the package |
| `node_modules/vitepress` | PKG_ROOT | Installed with the package |

`ensureVitepressFiles()` copies config.ts, index.md, and docsite.config.mjs from PKG_ROOT to CWD on first run if they don't exist.

## Rules

- Never write to PKG_ROOT from the CLI
- Always resolve user paths relative to CWD
- Templates and package assets always come from PKG_ROOT
<!-- check: grep "PKG_ROOT" bin/forgedocs.mjs | grep -v "const\|TEMPLATES\|VERSION\|node_modules\|vitepress\|config.ts\|index.md\|docsite.config" | grep "writeFile\|mkdirSync\|copyFile" | wc -l → should be 0 -->

## Trade-offs

- Users can run `forgedocs init` from any directory to create a new doc site
- Multiple doc sites possible (one per directory)
- VitePress config must be copied to CWD (not ideal, but VitePress requires it in the project root)
