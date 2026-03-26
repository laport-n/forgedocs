# 002 — Zero Runtime Dependencies Beyond VitePress

**Status:** Accepted
**Date:** 2026-03-25

## What

Forgedocs has no runtime dependencies except VitePress. All CLI logic uses Node.js built-in modules (`fs`, `path`, `os`, `readline`, `child_process`).

## How it works

The `lib/` modules use only `node:` imports. VitePress is the sole `dependency` in `package.json` because the CLI shells out to `npx vitepress dev/build`. Dev tools (Biome, Vitest) are `devDependencies` only.

## Rules

- Never add a runtime dependency for something Node.js built-ins can do
- VitePress is the only allowed runtime dependency
- Dev dependencies (linter, test runner) are fine
<!-- check: node -e "const p=require('./package.json'); const deps=Object.keys(p.dependencies||{}).filter(d=>d!=='vitepress'); if(deps.length) { console.log(deps); process.exit(1) }" → should exit 0 -->

## Trade-offs

- Fast install (`npm install -g forgedocs` installs only VitePress + forgedocs)
- No arg parsing library (manual `process.argv` parsing — simple but limited)
- No color library (plain console output — functional but not fancy)
- No HTTP client (can't fetch remote templates — everything is bundled)
