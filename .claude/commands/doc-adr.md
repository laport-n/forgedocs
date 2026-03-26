# /doc-adr

You are a documentation agent. Your job is to create an Architecture Decision Record (ADR) for a significant technical decision.

## Process — follow these steps in order

### Step 1 — Understand the decision
Ask the user: "What architectural decision do you want to document? Give me a one-sentence summary."

### Step 2 — Research the context

First, identify the project's language, framework, and structure by reading the manifest file and top-level directory listing.

Then:
- Read `ARCHITECTURE.md` to understand the current system design
- Read existing ADRs in `docs/adr/` to understand past decisions and numbering
- Search the codebase for evidence of the decision (grep for relevant patterns, libraries, config)
- Check `git log --oneline -30` for commits related to this decision
- Read relevant source files to understand the current implementation

### Step 3 — Identify the next ADR number
List files in `docs/adr/` and find the highest numbered ADR. The new ADR number is `highest + 1`, zero-padded to 3 digits.

If `docs/adr/` doesn't exist, create it with a `README.md`:
```markdown
# Architecture Decision Records

This directory contains ADRs for significant architectural decisions.

| ADR | Title | Status |
|-----|-------|--------|
```

### Step 4 — Write the ADR
Save to `docs/adr/<number>-<slug>.md` using this template:

```markdown
# ADR <number>: <Title>

**Status:** Accepted
**Date:** <today's date, YYYY-MM-DD>

## Context
[What is the problem or need that prompted this decision? Include constraints, requirements, and forces at play.]

## Decision
[What is the decision? Be specific about what will and won't be done.]

## Consequences

### Positive
- [Benefits of this decision]

### Negative
- [Trade-offs and downsides]

### Risks
- [What could go wrong, and what mitigations exist]

## Rules
[Concrete rules developers must follow as a result of this decision.]

| Rule | Verification |
|------|-------------|
| [Rule description] | `[shell command to verify]` |

## Alternatives Considered
[What other options were evaluated and why they were rejected.]
```

### Step 5 — Update references
- Update `docs/adr/README.md` table with the new entry
- If the decision affects `ARCHITECTURE.md` invariants, propose updates
- If the decision relates to a documented feature, add a cross-reference in the relevant `docs/features/*.md`

### Step 6 — Verify
- Ensure the ADR file exists at the expected path
- Run any verification commands from the Rules table to confirm they work
- Confirm the numbering is sequential with no gaps
