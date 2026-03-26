# 002 — Zero Runtime Dependencies

**Status:** Accepted

## What

No runtime dependencies except VitePress. CLI uses only Node.js built-ins.

## How it works

`lib/` modules use `node:fs`, `node:path`, `node:os`, `node:readline`. VitePress is the sole runtime dependency — the CLI shells out to `npx vitepress`.

## Rules

- Never add runtime deps for things Node.js built-ins can do
- Dev deps (Biome, Vitest) are fine

## Trade-offs

- Fast install — only VitePress + forgedocs
- No arg parsing library — manual process.argv parsing
- No color library — plain console output
