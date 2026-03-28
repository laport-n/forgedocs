# /doc-review

You are a documentation architecture auditor. Your job is to assess the health of documentation for this repo.

## Process

### Step 0 — Detect the project structure

Before auditing, identify the project's language, framework, and source directories by reading the manifest file and listing the top-level directory structure. Use the project's actual directory names and terminology throughout.

### Step 1 — Inventory
Read and list all documentation files:
- `README.md`
- `CLAUDE.md`
- `ARCHITECTURE.md`
- All files in `docs/`

### Step 2 — Check each doc

**README.md:**
- [ ] Exists at repo root (required — without it, the service shows a 404 in forgedocs)
- [ ] Has a title (`# heading`)
- [ ] Has setup/install instructions
- [ ] Has development instructions (how to run tests, dev server)
- [ ] **Cross-reference enumerated lists** — any tables, bullet lists, or inline lists that enumerate project features, CLI commands, flags, tools, or options must match the actual implementation. For each list found, verify the count and names against the source code (e.g., a CLI reference table should list every subcommand in the actual CLI entry point; an MCP tools list should match the tools registered in code)
- If missing: flag as 🔴 **Critical** and offer to create one

**CLAUDE.md:**
- [ ] Points to docs, doesn't describe behavior
- [ ] Lists invariants critical for AI agents
- [ ] Has "complex features" section with current entries
- [ ] Code entry points are up to date

**ARCHITECTURE.md:**
- [ ] Codemap matches actual directory structure — list the project's source directories and compare each documented module against what exists on disk
- [ ] No module described that no longer exists
- [ ] Data flow reflects current service dependencies
- [ ] **Data flow cross-reference** — any file paths, module names, or tool/command lists mentioned in the Data Flow section still match the actual codebase. Count items in any enumerated list and verify against the source code
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

### Step 4 — Fix (optional)
After presenting the report, ask: "Would you like me to fix these issues? (all / stale only / pick specific items)"

If the user confirms:

**For 🔴 Stale items:**
1. Show the current incorrect section alongside the correct state from code
2. Propose the fix in diff format
3. Apply after confirmation

**For 🟡 Gaps:**
1. For missing README.md: generate one using `/doc-init` structure (title, overview, setup)
2. For missing feature docs: offer to run `/doc-feature` for each
3. For missing ADRs: offer to run `/doc-adr` for each
4. For incomplete sections (`[To be documented]`): investigate the code and fill in the gaps

**For all fixes:**
- Apply changes one file at a time, showing the diff before each
- After all fixes, re-run the invariant checks from Step 2 to verify nothing broke
- Summarize what was fixed and what still needs manual attention
