# Feature: Quickstart

## Overview

`forgedocs quickstart` bootstraps documentation in any repository in under 30 seconds. It detects the tech stack, generates an ARCHITECTURE.md scaffold from the filesystem, creates the full docs/ structure, and installs Claude Code commands.

## Preconditions

- Target directory exists and is a code repository
- Node.js 20+ available

## How It Works

1. **Stack detection** (`lib/quickstart.mjs:detectStack`) — Scans for `package.json`, `Cargo.toml`, `go.mod`, `Gemfile`, Python dependency files. Matches against 9 built-in presets.

2. **Structure discovery** (`lib/quickstart.mjs:discoverStructure`) — Walks the directory tree (2 levels deep), skipping noise directories (node_modules, .git, dist, etc.). Builds a list of project directories.

3. **ARCHITECTURE.md generation** — Combines preset-specific codemap entries with discovered directories. Fills in data flow diagrams for known stacks. Marks unknowns as `[To be documented]`.

4. **Docs scaffold** — Creates `docs/glossary.md`, `docs/security.md`, `docs/service-map.md`, `docs/features/`, `docs/adr/`. Preset-specific extras (e.g., `docs/routing.md` for Next.js, `docs/api-endpoints.md` for FastAPI).

5. **Command installation** — Copies all 8 Claude commands, the doc-review skill, and the CI workflow into the target repo.

## Stack Presets

| Preset | Detection | Specific Additions |
|--------|-----------|-------------------|
| nextjs | `next.config.*` or `next` dep | App Router, Middleware, Public Assets in codemap |
| react | `react` dep (no Next.js) | Components, Pages, Hooks, State in codemap |
| fastapi | `fastapi` in Python deps | Routes, Models, Services + `docs/api-endpoints.md` |
| django | `django` or `manage.py` | Settings, URLs, Views, Models in codemap |
| express | `express` dep | Server, Routes, Controllers, Models in codemap |
| nestjs | `@nestjs/core` dep | Modules, Controllers, Services, Guards in codemap |
| rails | `Gemfile` + `config/routes.rb` | Routes, Controllers, Models, Views, Jobs in codemap |
| go | `go.mod` | cmd/, internal/ handler/service/repository in codemap |
| rust | `Cargo.toml` | main.rs, lib.rs, handlers/, models/ in codemap |

## Invariants

| Rule | Check |
|------|-------|
| Quickstart never overwrites existing files without --force | `node -e "const fs=require('fs'),os=require('os'),p=require('path');const d=fs.mkdtempSync(p.join(os.tmpdir(),'fq-'));fs.writeFileSync(p.join(d,'ARCHITECTURE.md'),'X');require('child_process').execSync('node bin/forgedocs.mjs quickstart '+d);console.log(fs.readFileSync(p.join(d,'ARCHITECTURE.md'),'utf-8')==='X'?0:1);fs.rmSync(d,{recursive:true})"` should print 0 |
| All 9 presets are valid | `node -e "import('./lib/quickstart.mjs').then(m=>console.log(m.listPresets().length))"` should print 9 |

## Failure Modes

- **Unknown preset**: throws with list of valid presets
- **Non-existent directory**: CLI exits with error before scaffold
- **No write permissions**: scaffold fails, partial files may remain (idempotent on re-run)
