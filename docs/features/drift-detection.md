# Feature: Drift Detection

## Overview

`forgedocs diff` compares the ARCHITECTURE.md codemap against the actual filesystem to detect documentation drift. It finds new directories not in the codemap, removed paths that are still referenced, and undocumented entries. No AI required — pure filesystem analysis.

## Preconditions

- Target repo has an ARCHITECTURE.md with a Codemap section
- Codemap uses the standard table format: `| Component | Path | Purpose |`

## How It Works

1. **Parse codemap** (`lib/diff.mjs:parseCodemap`) — Extracts component/path/purpose from the markdown table under `## Codemap`.

2. **Parse invariants** (`lib/diff.mjs:parseInvariants`) — Extracts rule/check pairs from the invariants table (commands in backticks).

3. **Compare with filesystem**:
   - For each codemap entry, check if the path exists on disk. Missing = `removed`.
   - For each entry with `[To be documented]` in purpose, flag as `stale`.
   - Scan top-level directories, skip noise (node_modules, .git, etc.). Any directory not in the codemap = `added`.

4. **Report invariants** — Lists all invariants with their verification commands for the user to run manually (commands are not executed for security reasons).

## Output Format

```
Drift Report: my-service

  New (not in codemap):
    + src/workers/ — New directory — not in ARCHITECTURE.md codemap

  Removed (in codemap but missing from filesystem):
    x Legacy — lib/legacy.mjs

  Undocumented (marked [To be documented]):
    ! New Module — src/new/

  Invariants (run manually to verify):
    ? No raw SQL — `grep -rn 'query(' src/ | wc -l`
```

## Invariants

| Rule | Check |
|------|-------|
| Diff throws without ARCHITECTURE.md | `node -e "import('./lib/diff.mjs').then(m=>{try{m.detectDrift('/tmp');console.log(1)}catch{console.log(0)}})"` should print 0 |

## Failure Modes

- **No ARCHITECTURE.md**: throws error with guidance to run quickstart
- **Malformed codemap table**: returns empty entries (graceful degradation)
- **Unreadable directories**: skipped silently
