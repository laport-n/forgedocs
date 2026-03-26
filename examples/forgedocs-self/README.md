# Forgedocs

Architecture documentation framework for codebases. Auto-discovers repos, renders docs with VitePress, and maintains them with AI-assisted commands that keep documentation in sync with code.

**Documentation that proves it's accurate** — invariants are verified automatically, freshness is checked in CI, and AI agents read the docs at every session.

## Quick Start

```bash
npm install -g forgedocs
forgedocs init        # discover repos interactively
forgedocs dev         # start the doc server at localhost:5173
```

## Bootstrap a Repo's Documentation

```bash
forgedocs install ~/path/to/repo   # install Claude Code commands
cd ~/path/to/repo
claude                              # open Claude Code
# Type: /doc-init                   # generates everything
```

This generates: README.md, ARCHITECTURE.md, CLAUDE.md, docs/ (glossary, security, service-map, ADRs), PR template, and CI workflow.

## CLI Commands

| Command | Description |
|---------|-------------|
| `forgedocs init` | Interactive setup — discover repos, create symlinks |
| `forgedocs dev` | Start the documentation dev server |
| `forgedocs build` | Build static site |
| `forgedocs add <path>` | Add a specific repo |
| `forgedocs remove <name>` | Remove a repo |
| `forgedocs status` | Show tracked repos and doc coverage |
| `forgedocs install <path>` | Install Claude Code commands into a repo |
| `forgedocs doctor` | Diagnose common issues |
| `forgedocs help` | Show help |

## Claude Code Commands

Installed into your repo via `forgedocs install` — available in any Claude Code session.

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/doc-init` | Generate full documentation structure by exploring code | First time — bootstrapping |
| `/doc-feature` | Create feature doc with invariants and failure modes | After building a complex feature |
| `/doc-sync` | Check if docs need updating after code changes | After a PR |
| `/doc-review` | Full audit — execute invariant checks | Quarterly or before a release |
| `/doc-onboard` | Generate personalized reading path | Onboarding a developer |
| `/doc-ci` | Generate CI workflow for doc freshness | Once per repo |

## CI Integration

Forgedocs installs a GitHub Actions workflow (`doc-freshness.yml`) that warns on every PR when structural changes need doc updates. It never blocks merges — warnings only.

## Requirements

- Node.js 20+
- One or more repos with an `ARCHITECTURE.md`

## License

MIT
