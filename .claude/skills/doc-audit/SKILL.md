---
name: doc-audit
description: Automatically check documentation drift after code changes. Use this after completing a coding task, committing code, or when finishing a session that modified source files. Detects stale references, missing modules in codemap, and enumeration drift in docs.
---

# Documentation Audit

## When this triggers

This skill activates after you've made code changes — especially after commits, new modules, renamed files, added CLI commands, or modified APIs.

## Steps

### 1. Detect what changed

Run `git diff HEAD~1 --name-only` (or `git diff --staged --name-only` if uncommitted) to identify changed files.

Classify changes:
- **Structural**: new/removed/renamed directories or modules
- **Behavioral**: new CLI commands, flags, API endpoints, tools, hooks
- **Configuration**: changed presets, options, defaults

If only documentation files changed (no source code), skip to step 4.

### 2. Run programmatic checks

Run `forgedocs audit . --json` (or `forgedocs check . --json` if audit is unavailable) and parse the results:

- **Lint errors**: broken file references, stale placeholders, missing sections
- **Drift**: new directories not in codemap, codemap entries pointing to missing paths, stale Data Flow references
- **Health score**: overall documentation health

If all checks pass and the score is unchanged, report "No drift detected" and stop.

### 3. Cross-reference enumerations

This is the step that catches **semantic drift** — when a list in the docs doesn't match the code.

For each **behavioral** change detected in step 1:
1. Search all markdown files for lists that enumerate the changed items (e.g., CLI commands table, flags list, tools list, presets table)
2. Verify each list is complete — count items in the doc vs items in the source code
3. Check inline enumerations too (e.g., "`--json` works on X, Y, Z")

Common patterns to check:
- CLI help text string in entry point vs README CLI reference table
- Registered tool/hook/plugin names vs documentation lists
- Exported function names vs codemap entries
- Configuration options vs docs

### 4. Report

If drift is found, present a concise report:

```
Documentation drift detected after recent changes:

Programmatic:
  - [lint/drift issues from forgedocs audit]

Semantic:
  - [list X in README.md has N items but code has M]
  - [flag --foo documented but not in CLI help text]

Suggested fix: Run /doc-sync to update affected documentation.
```

If no drift is found:
```
Documentation is in sync with code. No updates needed.
```

### 5. Auto-fix (if minor)

If the drift is limited to:
- A missing item in a list (add it)
- A stale file path reference (update it)
- A count that changed (update it)

Then propose the fix inline and apply it after confirmation.

For larger drift (new modules, restructured architecture), recommend running `/doc-sync` instead.
