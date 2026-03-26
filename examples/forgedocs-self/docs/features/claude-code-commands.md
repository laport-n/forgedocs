# Claude Code Commands

## What it does

Forgedocs installs 6 Claude Code commands into any repository via `forgedocs install`. These commands are markdown prompts that Claude Code executes to generate and maintain architecture documentation.

## Commands

| Command | Purpose | When to use |
|---------|---------|-------------|
| `/doc-init` | Bootstrap full documentation structure | First time — new repo |
| `/doc-feature` | Generate feature doc with invariants, preconditions, failure modes | After building a complex feature |
| `/doc-sync` | Check if docs need updating after code changes | After a PR that changes architecture |
| `/doc-review` | Full audit — execute invariant checks, produce health report | Quarterly or before a release |
| `/doc-onboard` | Generate personalized reading path with estimated times | Onboarding a new developer |
| `/doc-ci` | Generate GitHub Actions workflow for doc freshness checks | Once per repo — CI setup |

## How it works

1. `forgedocs install ~/path/to/repo` copies templates from `templates/claude-commands/` into the target repo's `.claude/commands/` directory
2. It also installs `.claude/skills/doc-review/SKILL.md` for automated reviews
3. It installs `.github/workflows/doc-freshness.yml` for CI checks
4. Each command is a markdown file containing a detailed prompt that guides Claude Code through a multi-step process

## Invariants

- Commands never generate placeholder content — every sentence comes from code exploration
- `/doc-init` always detects the tech stack before generating docs (Step 0)
- `/doc-init` creates or improves `README.md` if missing (required for the doc site)
- `/doc-review` executes verification commands from `ARCHITECTURE.md` invariants table
- ADRs are immutable — `/doc-sync` creates new ADRs instead of modifying existing ones

## Installation flow

```
forgedocs install ~/my-repo
  → copies 6 commands to .claude/commands/
  → copies doc-review skill to .claude/skills/
  → copies doc-freshness.yml to .github/workflows/
  → reports installed/skipped/updated files
```

After installation, open Claude Code in the target repo and run `/doc-init` to generate the full documentation structure.
