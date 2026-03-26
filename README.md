# Forgedocs

Architecture documentation framework for codebases. Auto-discovers repos, renders docs with VitePress, and maintains them with AI-assisted commands that keep documentation in sync with code.

**Documentation that proves it's accurate** — invariants are verified automatically, freshness is checked in CI, and AI agents read the docs at every session.

## Quick Start

```bash
npm install -g forgedocs
forgedocs init
forgedocs dev
```

Open http://localhost:5173.

Or without global install:

```bash
git clone https://github.com/laport-n/forgedocs.git
cd forgedocs
npm install
npx forgedocs init
npx forgedocs dev
```

## The Problem

Services have READMEs covering setup and deployment, but nothing that answers:
- "What does this service actually do and how is it organized?"
- "What are the rules I should never break?"
- "Why was this architectural decision made?"
- "How do the services talk to each other?"

This makes onboarding slow and AI agents lack context. When docs exist, nobody trusts them — they drift from the code within weeks.

## The Approach: Progressive Disclosure

Inspired by [matklad's ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html) and [OpenAI's Harness Engineering](https://openai.com/index/harness-engineering/), Forgedocs uses **layered documentation** where agents and developers start with a narrow, stable entry point and follow pointers to deeper context.

```
CLAUDE.md          ← Table of contents. "Where to look", not "how to do everything". ~50 lines.
    ↓
ARCHITECTURE.md    ← The map. Codemap, data flow, verifiable invariants. ~100-150 lines.
    ↓
docs/              ← Reference library. Glossary, security rules, service map, ADRs.
    ↓
docs/features/     ← Deep dives. Complex features with invariants and failure modes.
    ↓
code               ← The ultimate source of truth.
```

Each layer is progressively more detailed and less stable. The key: **don't document what the code already says** — document the "why", the invariants, the cross-cutting rules, the vocabulary.

## How It Works

Forgedocs doesn't contain documentation itself. It **auto-discovers** your local repos and creates symlinks to their docs, then renders everything as a unified site with VitePress.

```
forgedocs/                 ← this tool
├── content/               ← symlinks (gitignored, created by init)
│   ├── my-api/            → ~/projects/my-api/
│   └── my-service/        → ~/projects/my-service/
└── .vitepress/            ← auto-generates navigation, sidebar, search
```

A repo is detected if it contains an `ARCHITECTURE.md` at its root.

## CLI Reference

```
forgedocs <command> [options]
```

| Command | Description |
|---------|-------------|
| `forgedocs init` | Interactive setup — discover repos, create symlinks |
| `forgedocs dev` | Start the local documentation dev server |
| `forgedocs build` | Build static site in `.vitepress/dist/` |
| `forgedocs preview` | Preview the built site |
| `forgedocs add <path>` | Add a specific repo by path |
| `forgedocs remove <name>` | Remove a repo from the site |
| `forgedocs status` | Show status of all tracked repos |
| `forgedocs install <path>` | Install Claude Code commands into a repo |
| `forgedocs doctor` | Diagnose common issues |
| `forgedocs help` | Show help and list all commands |

Options: `--verbose` / `-v` for debug output, `--version`, `--help`.

## Claude Code Commands

Install into any repo with `forgedocs install ~/path/to/repo`, then use in Claude Code:

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/doc-init` | Generates full documentation structure by exploring code | First time — bootstrapping a repo |
| `/doc-feature` | Creates feature doc with invariants, preconditions, failure modes | After building a complex feature |
| `/doc-sync` | Checks if docs need updating after code changes | After a PR that changes architecture |
| `/doc-review` | Full audit — executes invariant checks, produces health report | Quarterly, or before a release |
| `/doc-onboard` | Generates personalized reading path with estimated times | Onboarding a new developer |
| `/doc-ci` | Generates GitHub Actions workflow for doc freshness checks | Once per repo — CI setup |

Also installs:
- `.claude/skills/doc-review/SKILL.md` — automated review skill
- `.github/workflows/doc-freshness.yml` — CI check for stale docs

## Documentation Structure

### Minimum (required)

```
my-service/
├── ARCHITECTURE.md       ← Detection marker — codemap, invariants
└── README.md             ← Shown as service home page
```

### Recommended

```
my-service/
├── ARCHITECTURE.md       ← Codemap, data flow, verifiable invariants
├── CLAUDE.md             ← AI agent entry point (conventions, anti-patterns)
├── README.md             ← Setup, deployment, usage
└── docs/
    ├── glossary.md       ← Domain vocabulary
    ├── service-map.md    ← Inter-service communication
    ├── security.md       ← Security rules
    ├── features/         ← One file per complex feature
    │   └── my-feature.md
    └── adr/              ← Architecture Decision Records
        ├── README.md
        └── 001-some-decision.md
```

The sidebar is generated automatically from whatever files exist.

| File | Purpose | Sidebar Section |
|------|---------|-----------------|
| `README.md` | Service overview, setup | Home |
| `ARCHITECTURE.md` | Codemap, data flow, invariants | Architecture |
| `CLAUDE.md` | AI agent conventions | — (not shown) |
| `docs/*.md` | Guides (glossary, security, etc.) | Guides |
| `docs/features/*.md` | Feature documentation | Features |
| `docs/adr/*.md` | Architecture Decision Records | ADRs |

See [`examples/sample-repo/`](examples/sample-repo/) for a complete example.

## Design Decisions

**Docs in repos, not wikis.** Confluence drifts because it's not in the PR loop. Docs next to code get reviewed with the code.

**`CLAUDE.md` is navigation, not description.** It says "business logic lives in `app/domains/`" — it doesn't explain each domain. That's ARCHITECTURE.md's job. Keeps CLAUDE.md small and stable.

**Invariants are verifiable.** Each rule in ARCHITECTURE.md includes a shell command that checks it. `/doc-review` executes them and reports pass/fail.

**Feature docs are on-demand.** Most code doesn't need a feature doc. `/doc-feature` generates them for genuinely complex features by exploring the code.

**The site is a viewer, not a source of truth.** It symlinks to real repos. Docs are always current, hot-reload works, there's nothing to sync.

## Configuration

Customize via `docsite.config.mjs`:

```js
export default {
  title: 'My Docs',
  description: 'Architecture documentation',
  github: 'https://github.com/my-org',
  scanDirs: ['~/projects', '~/work'],
  nestedDirs: ['packages', 'services', 'apps'],
  extraExcludes: ['content/*/my-custom-dir/**'],
}
```

## Documentation Lifecycle

| When | What to do |
|------|-----------|
| **Every PR** | PR template checklist + CI freshness check (automatic) |
| **After code changes** | `/doc-sync` — reads git diff, proposes updates |
| **Quarterly** | `/doc-review` — audits all docs, executes invariant checks |
| **New complex feature** | `/doc-feature` — generates structured feature doc |
| **New team member** | `/doc-onboard` — personalized reading path |

## Requirements

- **Node.js 20+**
- One or more repos with an `ARCHITECTURE.md`

## Troubleshooting

Run `forgedocs doctor` to diagnose issues automatically.

**`forgedocs dev` says "No repos configured"** — Run `forgedocs init` first.

**A service doesn't appear** — Check it has `ARCHITECTURE.md` at root. Run `forgedocs init` to refresh.

**Changes don't appear** — VitePress watches through symlinks. Restart `forgedocs dev` if needed.

**Search doesn't find content** — Search index builds on startup. Restart to re-index.

## License

MIT
