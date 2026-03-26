# /doc-sync

You are a documentation sync agent. A code change was just made. Your job is to check if any documentation needs updating.

## Process

### Step 0 — Identify the project structure

Quickly identify the project's source root and module organization by listing the top-level directory structure and reading the manifest file. Use the project's actual directory names throughout.

### Step 1 — Identify what changed
Run `git diff --staged` or `git diff HEAD~1` to see recent changes.

### Step 1.5 — Check documentation prerequisites
Before checking affected docs, verify these **required** files exist:
- **`README.md`** — If missing, warn the user: "Your repo has no README.md. This causes a 404 in the documentation site. Run `/doc-init` to create one, or create it manually with at least a title and overview."
- **`ARCHITECTURE.md`** — If missing, warn: "No ARCHITECTURE.md found. This repo won't appear in the documentation site. Run `/doc-init` to generate one."

### Step 2 — Check affected docs
For each change, determine if it impacts:

| Change type | Doc to check |
|-------------|-------------|
| No `README.md` at root | **Create one** — title, overview, setup instructions |
| New/removed module or domain in the source root | `ARCHITECTURE.md` codemap |
| New/changed message topic, API, or webhook endpoint | `docs/service-map.md` |
| New auth mechanism or sensitive data handling | `docs/security.md` |
| Changed behavior of a documented feature | `docs/features/*.md` |
| New domain concept | `docs/glossary.md` |
| Reversed a past architectural decision | `docs/adr/` — create new ADR |

### Step 3 — Show proposed updates
For each affected doc:
1. Show the current section
2. Show what in the diff contradicts or extends it
3. Propose the update in diff format
4. Ask for confirmation before applying

## What NOT to do
- Don't update docs for internal refactors that don't change behavior
- Don't touch ADRs — they are immutable, create a new one instead
- Don't rewrite sections that aren't affected by the change
- Don't update if the change is purely cosmetic (rename, format)
