# Feature: Doc Health Score

## Overview

`forgedocs score` calculates a documentation health score (0–100) for each tracked repository. The score is broken down by category (Structure, Quality, Depth) with individual checks that report pass/warn/fail status. `forgedocs badge` generates an SVG badge for READMEs.

## Preconditions

- Repository path exists on disk
- For multi-repo scoring: `.repos.json` configured via `forgedocs init`

## How It Works

### Scoring Model (`lib/health.mjs`)

**Structure (40 points):**
- ARCHITECTURE.md present (15 pts)
- README.md present (10 pts)
- CLAUDE.md present (5 pts)
- docs/ directory exists (5 pts)
- docs/service-map.md present (5 pts)

**Quality (30 points):**
- Verifiable invariants defined in ARCHITECTURE.md (10 pts)
- Codemap table present in ARCHITECTURE.md (10 pts)
- Service map not stale — "Last verified" date < 90 days (5 pts)
- docs/security.md present (5 pts)

**Depth (30 points):**
- docs/glossary.md with at least 1 term defined (10 pts)
- At least 1 feature doc in docs/features/ (10 pts)
- At least 1 ADR in docs/adr/ (10 pts)

### Badge Generation

SVG badges are color-coded:
- Green (#4c1): score >= 80%
- Yellow (#dfb317): score >= 60%
- Orange (#fe7d37): score >= 40%
- Red (#e05d44): score < 40%

## Invariants

| Rule | Check |
|------|-------|
| Empty directory scores 0 | `node -e "import('./lib/health.mjs').then(m=>{const os=require('os'),fs=require('fs'),p=require('path');const d=fs.mkdtempSync(p.join(os.tmpdir(),'fh-'));console.log(m.calculateHealth(d).score);fs.rmSync(d,{recursive:true})})"` should print 0 |
| Max possible score is 100 | `node -e "import('./lib/health.mjs').then(m=>{const os=require('os'),fs=require('fs'),p=require('path');const d=fs.mkdtempSync(p.join(os.tmpdir(),'fh-'));console.log(m.calculateHealth(d).maxScore);fs.rmSync(d,{recursive:true})})"` should print 100 |

## Failure Modes

- **Non-existent path**: CLI exits with error
- **Unreadable files**: individual checks fail gracefully, score reflects what's readable
