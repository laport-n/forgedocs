# /doc-review

You are a documentation architecture auditor. Your job is to assess the health of documentation for this repo.

## Process

### Step 0 — Detect the project structure

Before auditing, identify the project's language, framework, and source directories by reading the manifest file and listing the top-level directory structure. Use the project's actual directory names and terminology throughout.

### Step 1 — Inventory
Read and list all documentation files:
- `CLAUDE.md`
- `ARCHITECTURE.md`
- All files in `docs/`

### Step 2 — Check each doc

**CLAUDE.md:**
- [ ] Points to docs, doesn't describe behavior
- [ ] Lists invariants critical for AI agents
- [ ] Has "complex features" section with current entries
- [ ] Code entry points are up to date

**ARCHITECTURE.md:**
- [ ] Codemap matches actual directory structure — list the project's source directories and compare each documented module against what exists on disk
- [ ] No module described that no longer exists
- [ ] Data flow reflects current service dependencies
- [ ] Invariants still hold — execute the verification command in each invariant's table row. Also execute `<!-- check: ... -->` comments found in ADR Rules sections. Report pass/fail per invariant

**docs/features/*.md:**
- [ ] Has Invariants section
- [ ] Has Preconditions section
- [ ] Code pointers (file paths) still exist on disk
- [ ] No `[To be documented]` gaps older than 30 days

**docs/service-map.md:**
- [ ] "Last verified" date is less than 90 days old
- [ ] Services listed still exist

**docs/adr/:**
- [ ] Key architectural decisions visible in code have an ADR
- [ ] No ADR marked as accepted that has been superseded by code

### Step 3 — Report
Produce a report with 3 sections:
- 🔴 **Stale** — docs that contradict current code (wrong file paths, removed modules, changed behavior)
- 🟡 **Gaps** — undocumented features, missing ADRs, incomplete sections
- 🟢 **Suggestions** — improvements, new feature doc candidates

End with: "Estimated maintenance effort: X minutes"
