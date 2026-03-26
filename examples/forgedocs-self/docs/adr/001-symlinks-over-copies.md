# 001 — Symlinks Over Copies

**Status:** Accepted

## What

The `content/` directory uses filesystem symlinks to repos, not copies of markdown files.

## How it works

`lib/linker.mjs` creates symlinks from `content/<name>` → real repo path. VitePress watches through symlinks for hot-reload. Fallback chain: symlinks → junctions (Windows) → copy.

## Rules

- Always try symlinks first
- `content/` is gitignored, fully recreated on init
- Never modify files through symlinks — read-only

## Trade-offs

- Hot-reload works through symlinks
- Docs always current — no sync needed
- Windows without admin can't symlink (mitigated by fallback)
