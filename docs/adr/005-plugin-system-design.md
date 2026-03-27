# ADR 005: Minimal ESM-Only Plugin System With No Built-In Plugins

**Status:** Accepted
**Date:** 2026-03-27

## Context

Forgedocs needs extensibility for use cases beyond its core scope — OpenAPI rendering, Mermaid diagrams, custom page generation, integration with external tools. However, the project has a strict zero-runtime-dependency constraint (ADR-002) and is maintained by a small team. A plugin system must exist without becoming a maintenance burden.

Key constraints:
- The project is `"type": "module"` throughout — all lib/ modules use ESM
- `docsite.config.mjs` is already an ESM file loaded via dynamic `import()`
- Adding a plugin framework (like `tapable`, `hookable`, or `pluggy`) would violate ADR-002
- No user demand exists yet for specific plugins — the ecosystem is pre-1.0

## Decision

Ship a minimal plugin API (5 methods, 173 lines) that is:

1. **ESM-only** — plugins are ESM modules exporting a default function. No CJS support, no transpilation.
2. **No built-in plugins** — core features (health, diff, lint, export) stay in `lib/`, not wrapped as plugins. Plugins are for third-party extensions only.
3. **Narrow hook surface** — only 2 lifecycle hooks (`onDiscover`, `onBuild`) and 3 content methods (`addPages`, `addSidebarItems`, `addGlobalSidebarItems`). No hook for config mutation, theme override, or CLI extension.
4. **Fail-open** — a broken plugin prints a warning but never crashes the host. Each hook is individually try/caught.
5. **Marked Experimental** — the API may change between minor versions until stabilized.

Plugins are configured in `docsite.config.mjs` alongside other settings, using the same resolution patterns as the config itself.

## Consequences

### Positive
- Zero dependency cost — the plugin loader is 173 lines of Node.js built-ins (`fs`, `path`, dynamic `import()`)
- Matches the project's ESM-everywhere convention — no format mismatch
- Fail-open design means a bad plugin never takes down `forgedocs dev` or `forgedocs build`
- Small API surface is easy to document and unlikely to break

### Negative
- CJS plugins are not supported — authors must use `.mjs` or `"type": "module"`
- No plugin can extend the CLI (add subcommands) or modify VitePress theme config
- Without built-in plugins as examples, third-party authors have less reference material
- The hook integration points (`runDiscoverHooks`, `runBuildHooks`) are defined but not yet wired into the main CLI or VitePress config pipeline — plugins are loaded and tested but hooks are not called during normal operation

### Risks
- **API churn before stabilization** — mitigated by marking Experimental and keeping the surface small
- **Orphan API** — if no community plugins emerge, the system is dead code. Mitigated by the low maintenance cost (173 lines, tested)
- **Hook wiring gap** — discover/build hooks exist in code and tests but are not called from the CLI. This should be wired before promoting plugins to Stable tier

## Rules

| Rule | Verification |
|------|-------------|
| Plugins must be ESM modules with a default export | `grep -c "\.default" lib/plugins.mjs` should be > 0 |
| Plugin errors never crash the host process | `grep -c "catch" lib/plugins.mjs` should be >= 3 |
| No runtime dependency added for the plugin system | `grep -c "import.*from.*node:" lib/plugins.mjs` matches all imports |

## Alternatives Considered

**Use VitePress plugins directly** — VitePress has its own plugin system via Vite. Rejected because Forgedocs plugins need to hook into discovery and content generation, which happen before VitePress runs.

**Add a plugin framework (tapable, hookable)** — Would provide a battle-tested hook system. Rejected because it violates ADR-002 (zero runtime deps) and the current needs are simple enough for a hand-rolled solution.

**Ship built-in plugins for health/diff/export** — Would dogfood the API and provide examples. Rejected because these are core features that should load fast and unconditionally. Wrapping them as plugins adds indirection without benefit — they don't need to be optional.

**No plugin system at all** — Simpler, but closes the door on community extensions. The 173-line cost is low enough to justify keeping the door open.
