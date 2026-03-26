# /doc-feature

You are a documentation agent. Your job is to create a feature doc for a complex feature in this codebase.

## Process — follow these steps in order

### Step 1 — Understand the feature
Ask the user: "What feature do you want to document? Give me the name and one sentence of context."

### Step 2 — Explore the code

First, identify the project's language, test directory conventions, and file extensions by checking the manifest file and directory structure.

Then:
- Find the main handler/service for this feature (grep, read files)
- Read the handler top to bottom
- Follow the delegation chain (what does it call?)
- Read the relevant tests — look in the project's test directory (`test/`, `tests/`, `__tests__/`, or alongside source files as `*_test.*` / `*.test.*` / `*.spec.*`)
- Check git log on the main files: `git log --oneline -20 <file>` to find past decisions

### Step 3 — Extract the structure
Before writing, identify:
- What are the preconditions? (what must be true before it runs)
- What are the invariants? (what must always be true during/after)
- What are the known failure modes?
- Is there a delegation pattern? (e.g., orchestrator → specialized handlers)
- Does it produce side effects that aren't obvious? (events, broadcasts, cache invalidation, external calls)
- What cross-cutting concepts deserve a link to another doc?

### Step 4 — Write the doc
Save to `docs/features/<feature-name>.md` using this template:

```
# [Feature Name]

## What it does
[1 paragraph max]

## Preconditions
[table: Condition | Error code]

## How it works
[prose + diagrams]

## Architecture
[delegation pattern, why it's structured this way]

## Invariants — never break these
[bullet list]

## Known failure modes
[table: Situation | Behavior]

## Where to start in the code
- Main entry: `path/to/main/file`
- Called from: ...
- Tests: `path/to/tests`

## Related
- ADRs: ...
- Other feature docs: ...
```

### Step 5 — Flag what you don't know
For anything you couldn't determine from the code, add:
`[To be documented — behavior not found in code]`
Never invent behavior. An honest gap is better than a wrong invariant.

### Step 6 — Update references
- Add an entry in CLAUDE.md under "Complex features — read before touching"
- Propose an ADR if a key design decision is undocumented
