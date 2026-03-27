# Service Map

## Dependencies

| Service | Purpose | Protocol |
|---------|---------|----------|
| VitePress | Static site generation, dev server, search | ESM import (only runtime dependency) |
| Node.js fs | Filesystem operations (symlinks, file reads, watchers) | Built-in module |
| Node.js child_process | Spawning VitePress dev/build commands | Built-in module |

## Consumers

| Consumer | How it uses Forgedocs | Protocol |
|----------|-----------------------|----------|
| Claude Code (MCP) | Queries docs via `forgedocs mcp` | JSON-RPC 2.0 over stdio |
| Claude Code (Commands) | Runs `/doc-init`, `/doc-sync`, etc. via installed templates | Markdown prompt files in `.claude/commands/` |
| GitHub Actions | Runs `doc-freshness.yml` to check doc staleness on PRs | Shell scripts in CI workflow |
| VS Code Extension | Reads ARCHITECTURE.md and docs/ for sidebar and health score | Direct filesystem reads |
| VitePress config | Imports `discovery.ts`, `sidebar.ts`, `rewrites.ts` at build time | TypeScript ESM imports |

## Communication Diagram

```
Developer
  ├── CLI (forgedocs quickstart/dev/score/diff/watch/export)
  │     ├── lib/discovery.mjs → filesystem scan
  │     ├── lib/linker.mjs → symlinks into content/
  │     ├── lib/health.mjs → score calculation
  │     ├── lib/diff.mjs → drift detection
  │     └── VitePress (dev server / build)
  │           └── .vitepress/config.mts → discovery.ts, sidebar.ts, rewrites.ts
  │
  ├── Claude Code (AI agent)
  │     ├── MCP Server (forgedocs mcp) → JSON-RPC 2.0
  │     └── Commands (.claude/commands/*.md) → prompt templates
  │
  └── GitHub Actions
        └── doc-freshness.yml → shell checks on PR
```

*Last verified: 2026-03-26*
