# Docsite

Architecture documentation framework for codebases. Auto-discovers repos, renders docs with VitePress, and maintains them with AI-assisted commands that keep documentation in sync with code.

**Documentation that proves it's accurate** — invariants are verified automatically, freshness is checked in CI, and the agent reads the docs at every session.

## Why This Architecture

### The problem

Our services had READMEs covering setup and deployment, but nothing that answered:
- "What does this service actually do and how is it organized?"
- "What are the rules I should never break?"
- "Why was this architectural decision made?"
- "How do the services talk to each other?"

This made onboarding slow and AI agents (Claude Code) lacked context to work effectively. When the docs did exist, nobody trusted them — they drifted from the code within weeks.

### What we tried that didn't work

Following [OpenAI's Harness Engineering](https://openai.com/index/harness-engineering/) learnings, we avoided the "one big AGENTS.md" approach:

> "Context is a scarce resource. A large instruction file crowds out the task, code, and relevant docs, so the agent misses critical constraints."
>
> "Too much guidance ends up being no guidance. When everything is 'important', nothing is. Agents end up locally pattern-matching instead of navigating intentionally."
>
> "It fails immediately. A monolithic manual turns into a set of stale rules. Agents can't tell what's still valid, humans stop updating it, and the file gradually becomes a nuisance."

### What we do instead: progressive disclosure

Inspired by [matklad's ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html) and OpenAI's knowledge base approach, we use **layered documentation** where agents and developers start with a narrow, stable entry point and are told where to look next — rather than being overwhelmed upfront.

```
CLAUDE.md          ← Table of contents. Says "where to look", not "how to do everything".
                      Read by AI agents at the start of every session. ~50 lines.
    ↓ points to
ARCHITECTURE.md    ← The map. Codemap, data flow, verifiable invariants.
                      High-level, stable. Revised a few times per year. ~100-150 lines.
    ↓ points to
docs/              ← The reference library. Glossary, security rules, service map, ADRs.
                      Updated when patterns change, not when code changes.
    ↓ points to
docs/features/     ← Deep dives. Complex features with invariants, preconditions,
                      failure modes. Created on demand via /doc-feature.
    ↓ points to
code               ← The ultimate source of truth. Always up to date because it IS the code.
```

The documentation serves two audiences simultaneously: **developers who read it** and **AI agents who use it as context**. When CLAUDE.md and ARCHITECTURE.md are accurate, the agent makes better decisions — it knows the invariants, understands the architecture, and respects the rules. Docsite keeps these documents trustworthy.

Each layer is progressively more detailed and less stable. The key insight: **don't document what the code already says** — document the things you can't see in the code (the "why", the invariants, the cross-cutting rules, the vocabulary).

### Design decisions

**Docs live in each repo, not in a central wiki.** Confluence and Notion drift because they're not in the PR review loop. When docs live next to the code, a PR that changes architecture can (and should) update ARCHITECTURE.md in the same commit. The PR template checklist makes this visible.

**`CLAUDE.md` is navigation, not description.** It says "business logic lives in `app/domains/`" and "never bypass the Command pattern" — it does NOT explain what each domain does. That's what ARCHITECTURE.md is for. This keeps CLAUDE.md small (~50 lines), stable, and always useful.

**`ARCHITECTURE.md` follows the matklad style.** It's a map of the country, not an atlas of the states. It names modules and key types without linking to them (links break), describes data flow at a high level, and lists invariants — especially those expressed as absences ("controllers never access models directly"). It's meant to be revised a few times per year, not on every commit.

**Invariants are verifiable, not just documented.** Each architectural invariant in ARCHITECTURE.md includes a shell command that checks whether the invariant still holds. `/doc-review` executes these checks and reports pass/fail per invariant. ADR rules can also include `<!-- check: ... -->` HTML comments that are executed automatically. This transforms documentation from "promises we hope are still true" into "assertions we can prove."

**ADRs capture the "now", not just the "why".** ADRs document what is in place, how it works, the rules to follow, and the trade-offs. They're practical reference documents — a developer reads an ADR to understand what to do, not to learn the history of a debate. ADRs are never deleted, only superseded.

**Feature docs are created on-demand, not upfront.** Most code doesn't need a feature doc — the tests and the domain structure are documentation enough. Feature docs (`docs/features/`) are reserved for genuinely complex features where the invariants, edge cases, and delegation patterns are non-obvious from reading the code alone. The `/doc-feature` command generates them by exploring the code, not from templates.

**The docsite is a viewer, not a source of truth.** It contains zero documentation itself — it symlinks to your local repos. This means docs are always up to date (they ARE the files in the repo), there's no sync to maintain, and hot-reload works because VitePress watches the real files.

**No deployment, no CI, no infra.** The docsite runs locally. This is intentional — our docs contain internal architecture details, security patterns, and service-level specifics that shouldn't be exposed. Every developer runs their own instance with whichever repos they have cloned.

### What we chose NOT to do

| Approach | Why we skipped it |
|----------|-------------------|
| `docs/design-docs/` (OpenAI style) | Our services are technical adapters, not user-facing products with complex feature specs. ADRs cover the "why" sufficiently. |
| `docs/exec-plans/` (OpenAI style) | OpenAI uses these for orchestrating autonomous agents on long tasks. We don't have that workflow — project tracking lives in Linear/Jira. |
| `docs/references/*.txt` (llms.txt) | Useful for obscure libraries. Our stack (Rails, Sidekiq, NestJS) is well-represented in Claude's training data. |
| `QUALITY_SCORE.md` | Requires an active scoring process. Overhead without ROI at our team size. Revisit when the team grows. |
| Generated service-map from YAML | For 5-10 services with stable relationships, the maintenance cost of build tooling exceeds the cost of occasionally updating a Mermaid diagram. Revisit if we hit 20+ services. |
| Feature list per service | Redundant with `config/routes.rb` and `app/domains/`. A feature list drifts immediately and creates a false source of truth between the map (ARCHITECTURE.md) and the code. |

### How maintenance works

The documentation is designed so that **most of it doesn't need maintenance**:

| Document | How often it changes | Why |
|----------|---------------------|-----|
| `docs/glossary.md` | Almost never | Domain vocabulary (payment, authorization, clearing) is stable |
| `docs/adr/` | Only additions | ADRs are immutable — new ones are added, old ones are never changed |
| `docs/security.md` | When security patterns change | Auth mechanisms and sensitive data rules change infrequently |
| `CLAUDE.md` | When directory structure changes | It points to directories, not to specific files or behaviors |
| `ARCHITECTURE.md` | A few times per year | When bounded contexts are added/removed or data flow fundamentally changes |
| `docs/service-map.md` | When communication patterns change | New service added, REST→Kafka migration, new webhook |
| `docs/features/` | When feature behavior changes | The invariants and edge cases documented here are stable by design |

Active maintenance tools:
- **PR template checklist** — gentle reminder on every PR, not a blocking gate
- **CI freshness check** — GitHub Action that warns when structural changes need doc updates
- **`/doc-sync`** — run after a code change, it reads the diff and proposes updates
- **`/doc-review`** — quarterly audit that executes invariant checks and compares docs against the codebase
- **`/doc-onboard`** — generates onboarding paths for new developers

## Quick Start

```bash
git clone https://github.com/nlaporte/docsite.git
cd docsite
npm install
npm run setup
npm run docs
```

Open http://localhost:5173.

## How It Works

This repo doesn't contain any documentation itself. It **auto-discovers** your local service repos and creates symlinks to their docs.

```
docsite/                   ← this repo
├── content/               ← symlinks (gitignored, created by setup)
│   ├── processing/        → ~/working/.../processing/
│   ├── enfuce-adapter/    → ~/working/.../enfuce-adapter/
│   └── my-new-service/    → ~/projects/my-new-service/
└── .vitepress/            ← VitePress config (auto-generates navigation)
```

A repo is detected if it contains an `ARCHITECTURE.md` at its root. The setup script scans common locations (`../`, `~/working/`, `~/projects/`, `~/code/`) and finds repos automatically.

Your paths are saved in `.repos.json` (gitignored) — you only configure once.

## Requirements

- **Node.js 18+**
- One or more service repos cloned locally, each containing an `ARCHITECTURE.md`

## Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Auto-detect repos + create symlinks. Run once, or again to refresh. |
| `npm run setup -- --add ~/path/to/repo` | Add a specific repo manually. |
| `npm run docs` | Start the local doc server. |
| `npm run docs:build` | Build a static site in `.vitepress/dist/`. |
| `npm run install-commands -- ~/path/to/repo` | Install Claude Code commands into a repo. |

## Adding a New Service

No config needed. If your repo has an `ARCHITECTURE.md`, it will be auto-detected on the next `npm run setup`.

To add a repo that's not in a standard location:

```bash
npm run setup -- --add ~/some/custom/path/my-service
```

## Bootstrapping Documentation on a New Repo

### Option 1 — Use `/doc-init` (recommended)

Install the commands, then let Claude Code generate everything:

```bash
# From docsite
npm run install-commands -- ~/path/to/your-repo

# From your repo
cd ~/path/to/your-repo
claude
# Then type: /doc-init
```

Claude Code will explore your codebase and generate:
- `ARCHITECTURE.md` — High-level codemap, data flow, invariants
- `CLAUDE.md` — AI agent entry point (navigation-first)
- `docs/glossary.md` — Domain vocabulary
- `docs/service-map.md` — Inter-service communication
- `docs/security.md` — Security rules
- `docs/adr/` — Architecture Decision Records
- `.github/PULL_REQUEST_TEMPLATE.md` — Documentation checklist

### Option 2 — Install commands only

If you already have some documentation and just want the maintenance tools:

```bash
npm run install-commands -- ~/path/to/your-repo
```

This installs:

| Command | What it does |
|---------|-------------|
| `/doc-feature` | Creates feature documentation by exploring code, extracting invariants, preconditions, failure modes |
| `/doc-sync` | Checks if docs need updating after a code change |
| `/doc-review` | Full documentation audit — executes invariant checks and produces a health report |
| `/doc-onboard` | Generates a personalized onboarding reading path for new developers |
| `/doc-ci` | Generates a GitHub Actions workflow that checks doc freshness on every PR |

It also installs:
- `.claude/skills/doc-review/SKILL.md` — automated review skill
- `.github/workflows/doc-freshness.yml` — CI check that warns when PRs touch structure without updating docs

### Option 3 — Manual copy

Copy the templates directly:

```bash
# Commands
cp -r docsite/templates/claude-commands/ your-repo/.claude/commands/

# Skills
cp -r docsite/templates/claude-skills/ your-repo/.claude/skills/
```

## Documentation Conventions

For a repo to appear in this site, it needs at minimum:

```
my-service/
├── ARCHITECTURE.md          ← Required (detection marker)
└── README.md                ← Shown as the service home page
```

For the full experience:

```
my-service/
├── ARCHITECTURE.md          ← High-level codemap, data flow, invariants
├── CLAUDE.md                ← AI agent entry point (conventions, anti-patterns)
├── README.md                ← Setup, deployment, usage
└── docs/
    ├── glossary.md          ← Domain vocabulary
    ├── service-map.md       ← Inter-service communication
    ├── security.md          ← Security rules
    ├── features/            ← Complex feature docs (one per feature)
    │   └── my-feature.md
    └── adr/                 ← Architecture Decision Records
        ├── README.md        ← ADR index
        └── 001-some-decision.md
```

### File Roles

| File | Purpose | Sidebar Section |
|------|---------|-----------------|
| `README.md` | Service overview, setup instructions | Home |
| `ARCHITECTURE.md` | High-level codemap, data flow, invariants | Architecture |
| `CLAUDE.md` | AI agent conventions (not shown in sidebar) | — |
| `docs/*.md` | Guides (glossary, security, service map, etc.) | Guides |
| `docs/features/*.md` | Feature documentation | Features |
| `docs/adr/*.md` | Architecture Decision Records | ADRs |

## Documentation Lifecycle

### Day-to-day (automatic)

The PR template checklist reminds developers to update docs. The `doc-freshness.yml` GitHub Action **warns on every PR** when structural changes are detected without corresponding doc updates. Claude Code agents read `CLAUDE.md` automatically and know when docs need updating.

### After code changes

Run `/doc-sync` in Claude Code — it reads the git diff and proposes doc updates.

### Quarterly

Run `/doc-review` in Claude Code — it audits all documentation against the codebase, **executes invariant verification commands**, and produces a health report with pass/fail per invariant.

### New complex feature

Run `/doc-feature` in Claude Code — it explores the code and generates a structured feature doc with invariants, preconditions, and failure modes.

### New team member

Run `/doc-onboard` in Claude Code — it generates a personalized reading path based on the area the developer will work on, with estimated reading times and "first file to open" guidance.

## Features

- **Auto-discovery** — Finds repos automatically, no hardcoded list
- **Dynamic sidebar** — Generated from the actual files in each repo
- **Full-text search** — `Cmd+K` to search across all services
- **Hot-reload** — Edit a `.md` in any source repo, the page updates instantly
- **Dark mode** — Toggle in the top-right corner

## Reconfigure

```bash
# Reset everything and re-detect
rm .repos.json
npm run setup

# Add a single repo
npm run setup -- --add ~/path/to/repo

# Remove a repo: edit .repos.json and re-run setup
npm run setup
```

## Troubleshooting

**`npm run docs` says "No repos configured"**
→ Run `npm run setup` first.

**A service doesn't appear in the nav**
→ Check it has an `ARCHITECTURE.md` at the root. Run `npm run setup` to refresh.

**Changes in a source repo don't appear**
→ VitePress watches through symlinks. If it misses a change, restart `npm run docs`.

**Search doesn't find content**
→ Search index is built on startup. Restart to re-index.
