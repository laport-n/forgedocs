# Forgedocs

[![npm version](https://img.shields.io/npm/v/forgedocs)](https://www.npmjs.com/package/forgedocs)
[![CI](https://github.com/laport-n/forgedocs/actions/workflows/ci.yml/badge.svg)](https://github.com/laport-n/forgedocs/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Architecture docs that stay in sync with your code.** Auto-discovered from your repos. Verified by invariant checks. Maintained by AI commands.

Built for developers who want docs they can trust, and AI agents that actually understand the codebase.

**[See the live demo](https://laport-n.github.io/forgedocs/)**

## Try it in 30 seconds

```bash
npx forgedocs init       # discovers your repos automatically
npx forgedocs dev        # starts the doc site
```

Open [localhost:5173](http://localhost:5173) — your architecture docs are live.

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

## How it works

Forgedocs **symlinks** your local repos into a unified [VitePress](https://vitepress.dev/) site. Nothing is copied, nothing to sync — hot-reload just works.

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

Tools: `list_services` · `get_service_docs` · `search_docs` · `check_freshness`

## CLI Reference

| Command | Description |
|---------|-------------|
| `forgedocs init` | Interactive setup — discover repos, create symlinks |
| `forgedocs dev` | Start the documentation dev server |
| `forgedocs build` | Build static site for deployment |
| `forgedocs preview` | Preview the built site |
| `forgedocs add <path>` | Add a specific repo by path |
| `forgedocs remove <name>` | Remove a repo from the site |
| `forgedocs status` | Show status of all tracked repos |
| `forgedocs install <path>` | Install Claude Code commands into a repo |
| `forgedocs doctor` | Diagnose common issues |
| `forgedocs mcp` | Start MCP server for Claude Code |

Options: `--verbose` · `--json` (on `status` and `doctor`) · `--version` · `--help`

## Configuration

```js
// docsite.config.mjs
export default {
  title: 'My Docs',
  github: 'https://github.com/my-org',
  scanDirs: ['~/projects', '~/work'],
  nestedDirs: ['packages', 'services', 'apps'],
  maxDepth: 3,
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
- [`examples/monorepo/`](examples/monorepo/) — Multi-service with Node.js + Python
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
