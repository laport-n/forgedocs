# Feature: Export

## Overview

`forgedocs export` allows exporting documentation in two formats:
- **JSON** — structured data for integrations, CI, or external tools
- **HTML** — self-contained single-file HTML with inline CSS for sharing via email, Slack, or offline viewing

## How It Works

### JSON Export (`lib/export.mjs:exportJson`)

Collects all `.md` files from the repo root and `docs/`, `docs/features/`, `docs/adr/` directories. Returns a structured object:

```json
{
  "name": "my-service",
  "path": "/path/to/repo",
  "exportedAt": "2026-03-26T...",
  "documents": {
    "ARCHITECTURE.md": "# content...",
    "docs/glossary.md": "# content..."
  }
}
```

### HTML Export (`lib/export.mjs:exportHtml`)

Converts all markdown files to HTML using a built-in lightweight converter (no external dependencies). Features:
- Table of contents with anchor links
- Code blocks with dark background
- Tables with borders
- Inline formatting (bold, italic, code)
- Print-friendly CSS
- Responsive layout

## Invariants

| Rule | Check |
|------|-------|
| HTML export produces valid HTML | `node -e "import('./lib/export.mjs').then(m=>{console.log(m.exportHtml('.').includes('<!DOCTYPE html')?0:1)})"` should print 0 |
| JSON export includes all markdown files | `node -e "import('./lib/export.mjs').then(m=>{const r=m.exportJson('.');console.log(r.documents['ARCHITECTURE.md']?0:1)})"` should print 0 |

## Failure Modes

- **Non-existent path**: CLI exits with error
- **Unreadable files**: skipped silently, other files still exported
