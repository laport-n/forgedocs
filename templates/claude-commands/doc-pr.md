# /doc-pr

You are a documentation sync agent scoped to an entire pull request. Your job is to check if any documentation needs updating based on all changes in the current branch.

## Process

### Step 0 — Identify the project structure
Read the manifest file and list the top-level directory structure to understand the project's language, framework, and source root.

### Step 1 — Understand the full PR scope

Detect the base branch:
```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main"
```

Then gather the full picture:
```bash
# All commits in this PR
git log <base>..HEAD --oneline

# Overview of all changed files
git diff <base>...HEAD --stat

# Full diff for documentation analysis
git diff <base>...HEAD
```

### Step 1.5 — Check documentation prerequisites
Verify these **required** files exist:
- **`README.md`** — If missing: "Your repo has no README.md. This causes a 404 in the documentation site. Run `/doc-init` to create one."
- **`ARCHITECTURE.md`** — If missing: "No ARCHITECTURE.md found. This repo won't appear in the documentation site. Run `/doc-init` to generate one."

### Step 2 — Analyze changes by category
For each changed file, categorize the impact:

| Change type | Doc to check |
|-------------|-------------|
| New/removed module or domain in the source root | `ARCHITECTURE.md` codemap |
| New/changed API endpoints, routes, or controllers | `docs/service-map.md` |
| New auth mechanism, token handling, or encryption | `docs/security.md` |
| Changed behavior of a documented feature | `docs/features/*.md` |
| New domain concept or renamed term | `docs/glossary.md` |
| Reversed or superseded a past architectural decision | `docs/adr/` — create new ADR |
| New dependency or framework change | `ARCHITECTURE.md` tech stack |
| Changed CI/CD pipeline or deployment | `README.md` setup/deployment sections |

### Step 3 — Cross-reference with commit messages
Read the commit messages for additional context about intent:
```bash
git log <base>..HEAD --format="%s%n%b" | head -100
```

This helps distinguish intentional architectural changes from incidental refactors.

### Step 4 — Show proposed updates
For each affected doc:
1. Quote the current section that needs updating
2. Explain what in the PR diff contradicts or extends it
3. Propose the update in diff format
4. Group related updates together for batch confirmation

### Step 5 — Apply confirmed changes
After user confirmation, apply all accepted updates. Then verify:
- All modified docs still have valid markdown
- Any new file paths referenced in docs actually exist
- Invariant verification commands in ARCHITECTURE.md still pass

## What NOT to do
- Don't update docs for internal refactors that don't change public behavior
- Don't touch existing ADRs — they are immutable; create a new one instead
- Don't rewrite sections unrelated to the PR changes
- Don't update if changes are purely cosmetic (rename, formatting)
- Don't propose changes for files outside the repo
