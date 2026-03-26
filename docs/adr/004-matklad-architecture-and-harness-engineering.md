# 004 — matklad's ARCHITECTURE.md + OpenAI Harness Engineering as Foundation

**Status:** Accepted
**Date:** 2026-03-26

## What

Forgedocs is built on two complementary ideas from outside the project:

1. **matklad's ARCHITECTURE.md** ([blog post](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html)) — every codebase should have a short, high-level document that maps modules, data flows, and invariants. A map, not a manual. Updated rarely, read first.

2. **OpenAI's Harness Engineering** ([article](https://openai.com/index/building-an-ai-native-engineering-culture/)) — in an AI-native engineering culture, documentation quality directly determines AI agent effectiveness. Docs aren't just for humans — they're the context that prevents hallucination.

## How it works

Every feature in Forgedocs traces back to one or both ideas:

| Feature | matklad | Harness |
|---------|---------|---------|
| ARCHITECTURE.md as the discovery trigger | ✓ | |
| Codemap tables (module → path → purpose) | ✓ | ✓ |
| Verifiable invariants with shell commands | ✓ | ✓ |
| CLAUDE.md as navigation-first AI entry point | | ✓ |
| MCP server exposing structured doc data | | ✓ |
| `suggest_updates` tool for AI-driven maintenance | | ✓ |
| Progressive disclosure (CLAUDE → ARCH → docs/) | ✓ | ✓ |
| Drift detection (codemap vs filesystem) | ✓ | |

## Rules

- ARCHITECTURE.md must remain a map: concise (~100-150 lines), not exhaustive
- CLAUDE.md must be navigation-first ("look here"), not description-first ("here's how")
- Every invariant must include a verification command — not prose, not trust
- MCP tools must return structured data (JSON), not formatted text
<!-- check: grep -c "JSON.stringify" lib/mcp-server.mjs → should be > 5 -->

## Trade-offs

- Opinionated structure limits flexibility — repos must follow the ARCHITECTURE.md convention
- AI-focused features (MCP, CLAUDE.md) are only useful to Claude Code users today
- Verifiable invariants require shell commands, which not all teams are comfortable writing
