---
name: doc-review
description: Review documentation accuracy against current codebase. Run quarterly or after major refactors to detect stale docs.
---

# Documentation Review

## What this skill does

Compares the documentation files against the current state of the codebase and flags discrepancies.

## Steps

### 0. Detect the project structure

Before starting, identify the project's language, framework, source directories, and test conventions by reading the manifest file and listing the top-level directory structure. Use the project's actual directory names and terminology throughout.

### 1. ARCHITECTURE.md — Codemap accuracy

Read `ARCHITECTURE.md` and extract every directory or module listed in the Codemap section. Then list the actual directories under the project's source root(s). Compare documented modules against actual directories:
- Flag modules that are documented but no longer exist on disk
- Flag directories that exist but are not documented
- Flag descriptions that no longer match the directory's actual contents

Report: list discrepancies as a table (documented vs actual).

### 2. ARCHITECTURE.md — Data flow accuracy

Read the "Data Flow" section. Trace one real request through the code (pick the most common flow) and verify the diagram is still accurate.

Report: flag any steps that have changed.

### 3. ARCHITECTURE.md — Invariants check (executable)

Read the "Architectural Invariants" section. Invariants should be formatted as a table with a `Verification` column containing a shell command.

**For each invariant that has a verification command:** execute the command and check the result. If the output is non-empty (or non-zero), the invariant is violated.

**For each invariant marked `[manual review]`:** attempt to determine what a violation would look like and search for that pattern.

**For ADRs with `<!-- check: ... -->` comments in their Rules section:** extract and execute those checks too.

Report as a table:

| Invariant | Status | Details |
|-----------|--------|---------|
| All mutations go through Commands | ✅ Pass | 0 violations found |
| No heavy work in webhooks | ❌ Fail | `app/controllers/api/v0/foo_controller.rb:42` — direct HTTP call |
| Models are tenant-scoped | ⚠️ Manual | No automated check available |

### 4. CLAUDE.md — Sources of truth

Read the "Where things live" section in CLAUDE.md. Verify each path listed actually exists.

Report: flag any broken references.

### 5. docs/service-map.md — Communication patterns

Read `docs/service-map.md`. Check:
- Are all services listed still relevant?
- Are the message topics/queues mentioned still in use? (grep for topic/queue names in code)
- Are the webhook/API endpoints still active? (check route definitions or endpoint registrations)

Report: flag outdated entries.

### 6. docs/adr/ — Completeness

List all ADRs in `docs/adr/README.md`. For each:
- Verify the linked file exists.
- Check the status field.

Also: scan config files and dependencies for major patterns not covered by any ADR. Suggest new ADRs if found.

Report: list missing ADR files and suggest new ADRs.

## Output format

Produce a summary report with:
1. ✅ Documentation that is accurate
2. ⚠️ Documentation that needs minor updates (terminology, counts, etc.)
3. ❌ Documentation that is wrong or missing (structural changes not reflected)
4. 💡 Suggested new ADRs or documentation additions

Do NOT modify any files. This skill is read-only — it reports findings for human review.
