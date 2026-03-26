---
layout: home

hero:
  name: Docforge
  text: Architecture Documentation That Stays Accurate
  tagline: Auto-discovered from your repos. Verified by invariant checks. Maintained by AI-assisted commands.
  actions:
    - theme: brand
      text: Get Started
      link: https://github.com/nlaporte/docforge#quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/nlaporte/docforge

features:
  - title: Verifiable Invariants
    details: "Each architectural rule includes a check command. /doc-review executes them and reports pass/fail — documentation that proves it's correct."
  - title: AI Agent-Aware
    details: "CLAUDE.md gives your AI coding agent real context. It reads the docs at every session, knows the invariants, and respects the rules."
  - title: CI Freshness Checks
    details: "GitHub Action warns on PRs when structural changes need doc updates. No stale docs slipping through."
  - title: Auto-Discovery
    details: "Any repo with an ARCHITECTURE.md is detected. Hot-reload, full-text search, dynamic sidebar — no config needed."
---

## Quick Start

```bash
npm install -g forgedocs
docforge init        # discover repos
docforge dev         # start the doc server
```

Or bootstrap a new repo's documentation:

```bash
docforge install ~/path/to/your-repo   # install Claude Code commands
cd ~/path/to/your-repo
claude                                   # open Claude Code
# Type: /doc-init                        # generate everything
```

## Documentation Structure

For a repo to appear in this site, it needs an `ARCHITECTURE.md` at its root. The more docs you add, the richer the sidebar becomes.

### Minimum (required)

```
my-service/
├── ARCHITECTURE.md       ← Detection marker — codemap, invariants
└── README.md             ← Shown as the service home page
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

## CLI Reference

| Command | Description |
|---------|-------------|
| `docforge init` | Interactive setup — discover repos, create symlinks |
| `docforge dev` | Start the documentation dev server |
| `docforge build` | Build static site |
| `docforge add <path>` | Add a specific repo |
| `docforge remove <name>` | Remove a repo |
| `docforge status` | Show tracked repos and their doc coverage |
| `docforge install <path>` | Install Claude Code commands into a repo |
| `docforge doctor` | Diagnose common issues |

## Claude Code Commands

Installed into your repo via `docforge install` — available in any Claude Code session.

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/doc-init` | Generates full documentation structure by exploring code | Bootstrapping a new repo |
| `/doc-feature` | Creates feature doc with invariants, preconditions, failure modes | After building a complex feature |
| `/doc-sync` | Checks if docs need updating after code changes | After a PR that changes architecture |
| `/doc-review` | Full audit — executes invariant checks, compares docs against code | Quarterly, or before a release |
| `/doc-onboard` | Generates personalized reading path with estimated times | Onboarding a new developer |
| `/doc-ci` | Generates GitHub Actions workflow for doc freshness checks | Once per repo — CI setup |

### Feature docs convention

Place one markdown file per feature under `docs/features/`. The sidebar title is extracted from the first `# Heading` in the file:

```markdown
# Go Back In Time (GBIT)

## What it does
...
```
