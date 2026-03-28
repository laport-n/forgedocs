# Forgedocs

[![npm version](https://img.shields.io/npm/v/forgedocs)](https://www.npmjs.com/package/forgedocs)
[![CI](https://github.com/laport-n/forgedocs/actions/workflows/ci.yml/badge.svg)](https://github.com/laport-n/forgedocs/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Doc Health](docs/badge-health.svg)

**Architecture docs that stay in sync with your code.** Auto-discovered from your repos. Verified by invariant checks. Maintained by AI commands.

Built for developers who want docs they can trust, and AI agents that actually understand the codebase.

**[See the live demo](https://laport-n.github.io/forgedocs/)**

## Philosophy

Forgedocs stands on two ideas:

**[matklad's ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html)** — Every repo deserves a high-level map: what the modules are, how data flows, and what rules must never be broken. A short document that a new developer (or an AI agent) reads first and revisits rarely. Not a manual — a map.

**[OpenAI's Harness Engineering](https://openai.com/index/building-an-ai-native-engineering-culture/)** — Documentation isn't just for humans anymore. When AI agents code alongside you, the quality of your docs directly determines the quality of their output. CLAUDE.md, verifiable invariants, and structured MCP tools exist so that agents don't hallucinate — they navigate.

Forgedocs is the tooling that makes both ideas practical: scaffold the docs, verify they stay true, and expose them to AI agents as structured data.

## Try it in 30 seconds

```bash
cd ~/my-project
npx forgedocs quickstart  # detects stack, scaffolds docs, installs AI commands
npx forgedocs dev         # starts the doc site
```

Open [localhost:5173](http://localhost:5173) — your architecture docs are live.

Or for multi-repo setups:

```bash
npx forgedocs init       # discovers all your repos automatically
npx forgedocs dev        # unified doc site across all repos
```

## The problem

Your repos have READMEs. But nobody can answer:

- *"What does this service actually do and how is it organized?"*
- *"What are the rules I should never break?"*
- *"How do the services talk to each other?"*

Docs exist in wikis, but they drifted months ago. AI agents hallucinate because they lack real context. New developers take weeks to onboard.

## What Forgedocs does differently

**Zero-config discovery** — Any repo with an `ARCHITECTURE.md` is detected. No manifest, no config file, no manual setup.

**Docs live in your repos, not in wikis** — They're in the PR loop. They get reviewed with the code. They can't drift silently.

**Invariants are verifiable** — Each rule in ARCHITECTURE.md includes a shell command that checks it. `/doc-review` executes them and reports pass/fail.

**8 AI commands for Claude Code** — `/doc-init` generates everything from scratch. `/doc-sync` updates after changes. `/doc-review` audits quarterly. No manual markdown editing.

**MCP server for Claude** — Claude queries your docs mid-task: search across repos, read any doc, check freshness. Your doc site becomes an active knowledge base.

**CI freshness checks** — A GitHub Action warns on PRs when code changes need doc updates. No stale docs slipping through.

**Doc Health Score** — Structure (40 pts: ARCHITECTURE.md, README, CLAUDE.md, docs/, service-map) + Quality (30 pts: invariants, codemap, freshness, security) + Depth (30 pts: glossary, features, ADRs) = 100. Generate SVG badges, set CI thresholds. [Full breakdown](docs/features/health-score.md).

**Drift Detection** — `forgedocs diff` compares your ARCHITECTURE.md codemap against the actual filesystem. New directories, deleted modules, stale entries — all detected without AI.

**Stack-aware quickstart** — `forgedocs quickstart --preset nextjs` generates documentation scaffolds tailored to your tech stack (Next.js, FastAPI, Rails, Go, Rust, and more).

**Export anywhere** — Export docs as self-contained HTML (for sharing) or JSON (for integrations). No server needed.

**VS Code extension** — Doc health in the status bar, documentation browser in the sidebar, drift warnings inline.

## How it works

Forgedocs **symlinks** your local repos into a unified [VitePress](https://vitepress.dev/) site. Nothing is copied, nothing to sync — hot-reload just works.

**Why VitePress?** Single runtime dependency. Gives markdown rendering, full-text search, hot-reload via symlinks, and static site generation — no framework or app server needed. Forgedocs adds zero dependencies on top of it.

```
forgedocs/
├── content/             ← symlinks (auto-created)
│   ├── my-api/          → ~/projects/my-api/
│   └── my-service/      → ~/projects/my-service/
└── .vitepress/          ← auto-generates navigation, sidebar, search
```

Documentation follows **progressive disclosure** — each layer is more detailed and less stable:

```
CLAUDE.md          ← Where to look. ~50 lines.
    ↓
ARCHITECTURE.md    ← The map. Codemap, data flow, verifiable invariants.
    ↓
docs/              ← Reference. Glossary, security, service map, ADRs.
    ↓
docs/features/     ← Deep dives. Complex features with invariants.
    ↓
code               ← The source of truth.
```

### Deployment and CI

During development, `content/` contains symlinks to your local repos — edits appear instantly via hot-reload.

For deployment, `forgedocs build` runs VitePress's static site generator, which resolves all symlinks and produces a self-contained `dist/` directory. No symlinks survive into the build output. Deploy `dist/` to any static host (GitHub Pages, Netlify, Vercel, S3).

In CI environments where symlinks are unavailable, the linker falls back automatically: symlinks → directory junctions (Windows) → copy markdown files. The copy fallback ensures `forgedocs build` works in sandboxed CI runners.

---

## Claude Code Commands

Install into any repo with `forgedocs install ~/path/to/repo`:

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/doc-init` | Generates full documentation structure by exploring code | Bootstrapping a new repo |
| `/doc-feature` | Creates feature doc with invariants, preconditions, failure modes | After building a complex feature |
| `/doc-sync` | Checks if docs need updating after code changes | After a PR that changes architecture |
| `/doc-review` | Full audit — executes invariant checks, produces health report | Quarterly, or before a release |
| `/doc-onboard` | Generates personalized reading path with estimated times | Onboarding a new developer |
| `/doc-adr` | Creates a numbered ADR by researching codebase and git history | After a significant architectural decision |
| `/doc-pr` | Checks all PR changes against docs, proposes updates | Before merging a PR |
| `/doc-ci` | Generates GitHub Actions workflow for doc freshness checks | Once per repo — CI setup |

Also installs `.claude/skills/doc-review/SKILL.md` and `.github/workflows/doc-freshness.yml`.

## MCP Server

Claude can query your docs programmatically. Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "forgedocs": {
      "command": "forgedocs",
      "args": ["mcp"],
      "cwd": "/path/to/your/docsite"
    }
  }
}
```

Tools: `list_services` · `get_service_docs` · `search_docs` · `check_freshness` · `get_health_score` · `get_codemap` · `check_drift` · `suggest_updates` · `query_docs` · `lint_docs`

## CLI Reference

| Command | Description |
|---------|-------------|
| `forgedocs init` | Interactive setup — discover repos, create symlinks |
| `forgedocs quickstart [path]` | Bootstrap docs in a repo (detect stack, scaffold, install commands) |
| `forgedocs dev` | Start the documentation dev server |
| `forgedocs build` | Build static site for deployment |
| `forgedocs preview` | Preview the built site |
| `forgedocs add <path>` | Add a specific repo by path |
| `forgedocs remove <name>` | Remove a repo from the site |
| `forgedocs status` | Show status of all tracked repos |
| `forgedocs score [path]` | Show doc health score (0–100) for a repo or all repos |
| `forgedocs badge [path]` | Generate SVG doc health badge |
| `forgedocs diff [path]` | Detect documentation drift (codemap vs filesystem) |
| `forgedocs lint [path]` | Lint docs (broken refs, stale placeholders, invariant syntax, structure) |
| `forgedocs check [path]` | Run all checks: lint + diff + score in one command (ideal for CI) |
| `forgedocs audit [path]` | Alias for `check` — full documentation audit in one command |
| `forgedocs export <json\|html> [path]` | Export docs as JSON or self-contained HTML |
| `forgedocs watch` | Watch repos for changes that need doc updates |
| `forgedocs install <path>` | Install Claude Code commands into a repo |
| `forgedocs doctor` | Diagnose common issues |
| `forgedocs mcp` | Start MCP server for Claude Code |

Options: `--verbose` · `--json` (on `status`, `doctor`, `score`, `diff`, `check`, `lint`) · `--preset <name>` · `--output <file>` · `--force` · `--threshold <n>` (on `check`) · `--version` · `--help`

### Stack Presets

Use with `forgedocs quickstart --preset <name>`:

| Preset | Auto-detected by |
|--------|-----------------|
| `nextjs` | `next.config.*` or `next` dependency |
| `react` | `react` dependency (without Next.js) |
| `fastapi` | `fastapi` in Python deps |
| `django` | `django` in Python deps or `manage.py` |
| `express` | `express` dependency |
| `nestjs` | `@nestjs/core` dependency |
| `rails` | `Gemfile` + `config/routes.rb` |
| `go` | `go.mod` |
| `rust` | `Cargo.toml` |

## Maturity Tiers

| Tier | What's included |
|------|----------------|
| **Core** | CLI (init, dev, build, quickstart, score, diff, lint, check, install), Claude Code commands, MCP server |
| **Stable** | Export, watch, badge, doctor, CI workflow template |
| **Experimental** | Plugin system, VS Code extension |

Core and Stable features follow semver. Experimental features may change between minor versions.

## Plugins (Experimental)

Extend Forgedocs with plugins in `docsite.config.mjs`:

```js
export default {
  plugins: [
    'forgedocs-plugin-openapi',              // npm package
    ['forgedocs-plugin-mermaid', { theme: 'dark' }],  // with options
    './my-local-plugin.mjs',                 // local file
  ]
}
```

Plugins can add pages, sidebar items, and hook into discovery/build. See [`docs/features/plugins.md`](docs/features/plugins.md) for the full API reference.

## VS Code Extension (Experimental)

The `extensions/vscode/` directory contains a VS Code extension that provides:

- **Status bar** — doc health score at a glance
- **Sidebar** — browse ARCHITECTURE.md, features, ADRs, glossary
- **Drift warnings** — notified when code changes may need doc updates
- **Commands** — open architecture, check drift, launch doc site

Activates automatically when a workspace contains `ARCHITECTURE.md`.

## Configuration

```js
// docsite.config.mjs
export default {
  title: 'My Docs',
  github: 'https://github.com/my-org',
  scanDirs: ['~/projects', '~/work'],
  nestedDirs: ['packages', 'services', 'apps'],
  maxDepth: 3,
  plugins: [],
}
```

Repo registry (`.repos.json`) maps names to paths — managed by `init`/`add`/`remove`, or edit manually:

```json
{
  "my-api": "/Users/you/projects/my-api",
  "my-service": "/Users/you/projects/my-service"
}
```

## Documentation Structure

```
my-service/
├── ARCHITECTURE.md       ← Required — codemap, data flow, verifiable invariants
├── CLAUDE.md             ← AI agent entry point (conventions, anti-patterns)
├── README.md             ← Service home page (setup, deployment)
└── docs/
    ├── glossary.md       ← Domain vocabulary
    ├── service-map.md    ← Inter-service communication
    ├── security.md       ← Security rules
    ├── features/         ← One file per complex feature
    └── adr/              ← Architecture Decision Records
```

The sidebar is generated automatically from whatever files exist. Only `ARCHITECTURE.md` is required.

## Examples

- [`examples/sample-repo/`](examples/sample-repo/) — Minimal single-service
- [`examples/monorepo/`](examples/monorepo/) — 4-service e-commerce platform (API scores 100, shows progressive disclosure)
- [`examples/forgedocs-self/`](examples/forgedocs-self/) — Forgedocs documenting itself

## Community

- [Discussions](https://github.com/laport-n/forgedocs/discussions) — Questions, ideas, show & tell
- [Issues](https://github.com/laport-n/forgedocs/issues) — Bug reports and feature requests
- [Contributing](CONTRIBUTING.md) — How to contribute

## Troubleshooting

Run `forgedocs doctor` to diagnose issues automatically.

| Problem | Solution |
|---------|----------|
| "No repos configured" | Run `forgedocs init` |
| Service doesn't appear | Check it has `ARCHITECTURE.md` at root |
| Changes don't appear | Restart `forgedocs dev` |
| Search misses content | Restart to re-index |

## Requirements

Node.js 20+ · One or more repos with `ARCHITECTURE.md`

## License

MIT
