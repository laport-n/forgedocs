---
layout: home

hero:
  name: Docsite
  text: Architecture Documentation That Stays Accurate
  tagline: Auto-discovered from your repos. Verified by invariant checks. Maintained by AI-assisted commands.

features:
  - title: Verifiable Invariants
    details: "Each architectural rule includes a check command. /doc-review executes them and reports pass/fail — documentation that proves it's correct."
  - title: AI Agent-Aware
    details: "CLAUDE.md makes your AI coding agent smarter about your codebase. The agent reads the docs at every session and respects the invariants."
  - title: CI Freshness Checks
    details: "GitHub Action warns on PRs when structural changes need doc updates. No stale docs slipping through."
  - title: Auto-Discovery
    details: "Any repo with an ARCHITECTURE.md is detected. Hot-reload, full-text search, dynamic sidebar — no config needed."
---

## Bootstrap a New Repo

Install Claude Code commands, then generate the full documentation structure:

```bash
# From docsite — install commands into your repo
npm run install-commands -- ~/path/to/your-repo

# From your repo — generate everything
cd ~/path/to/your-repo
claude
# Type: /doc-init
```

## Documentation Structure

For a repo to appear in this site, it needs an `ARCHITECTURE.md` at its root. The more docs you add, the richer the sidebar becomes.

### Minimum (required)

```
my-service/
├── ARCHITECTURE.md       ← Detected by setup — high-level codemap, invariants
└── README.md             ← Shown as the service home page
```

### Recommended

```
my-service/
├── ARCHITECTURE.md       ← Codemap, data flow, invariants
├── CLAUDE.md             ← AI agent entry point (conventions, anti-patterns)
├── README.md             ← Setup, deployment, usage
└── docs/
    ├── glossary.md       ← Domain vocabulary
    ├── service-map.md    ← Inter-service communication
    ├── security.md       ← Security rules
    ├── features/         ← Feature documentation (one file per feature)
    │   └── my-feature.md
    └── adr/              ← Architecture Decision Records
        ├── README.md
        └── 001-some-decision.md
```

The sidebar is generated automatically from whatever files exist — no manual config needed.

### File Roles

| File | Purpose | Sidebar Section |
|------|---------|-----------------|
| `README.md` | Service overview, setup instructions | Home |
| `ARCHITECTURE.md` | High-level codemap, data flow, verifiable invariants | Architecture |
| `CLAUDE.md` | AI agent conventions (not shown in sidebar) | — |
| `docs/*.md` | Guides (glossary, security, service map, etc.) | Guides |
| `docs/features/*.md` | Feature documentation (what a feature does, how it works) | Features |
| `docs/adr/*.md` | Architecture Decision Records | ADRs |

## Claude Code Commands

These commands are installed into your repo via `npm run install-commands` and are available in any Claude Code session.

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/doc-init` | Generates the full documentation structure by exploring your codebase | First time — bootstrapping a new repo |
| `/doc-feature` | Creates a feature doc by exploring code, extracting invariants, preconditions, and failure modes | After building a complex feature |
| `/doc-sync` | Checks if docs need updating after a code change — compares `git diff` against existing docs | After a PR that changes architecture or behavior |
| `/doc-review` | Full documentation audit — executes invariant checks, compares docs against codebase | Quarterly, or before a major release |
| `/doc-onboard` | Generates a personalized reading path with estimated times for new developers | When onboarding someone to a codebase or domain |
| `/doc-ci` | Generates a GitHub Actions workflow that checks doc freshness on PRs | Once per repo — sets up CI integration |

### Features convention

Place one markdown file per feature under `docs/features/`. The sidebar entry title is extracted from the first `# Heading` in the file, so keep it descriptive. Example:

```markdown
# Go Back In Time (GBIT)

## What it does
...
```
