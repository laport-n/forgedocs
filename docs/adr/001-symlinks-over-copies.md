# 001 — Symlinks Over Copies for Content Linking

**Status:** Accepted
**Date:** 2026-03-25

## What

The `content/` directory uses filesystem symlinks pointing to the user's real repos rather than copying markdown files.

## How it works

`lib/linker.mjs` creates symlinks from `content/<repo-name>` to the absolute path of each repo. VitePress is configured with `preserveSymlinks: true` and `followSymlinks: true` to watch through symlinks. The `server.fs.allow` list includes all repo paths from `.repos.json`.

Fallback chain: symlinks → junctions (Windows without admin) → copy markdown files only.

## Rules

- Always create symlinks first, fall back only on failure
- The `content/` directory is gitignored and fully recreated on each `forgedocs init`
- Never modify files through symlinks — Forgedocs is read-only
<!-- check: grep -r "writeFile\|appendFile" lib/linker.mjs | wc -l → should be 0 -->

## Trade-offs

- Hot-reload works because VitePress watches the real files through symlinks
- Docs are always current — no sync step needed
- Windows without admin rights can't use symlinks (mitigated by junction/copy fallback)
- Broken symlinks possible if repo is moved/deleted (mitigated by `forgedocs doctor`)
