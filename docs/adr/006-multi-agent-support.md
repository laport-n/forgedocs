# 006 — Multi-Agent Documentation Support

**Status:** Proposed
**Date:** 2026-04-09

## What

Extend forgedocs so that the full documentation lifecycle — scaffolding, maintenance, drift detection, standards enforcement — works regardless of which AI coding agent a developer uses: Claude Code, Cursor, Windsurf, GitHub Copilot, or Cline.

## Context

### The documentation stack is already agent-agnostic

Forgedocs produces documentation that any agent can read:

- ARCHITECTURE.md with codemap, data flow, and verifiable invariants
- docs/ with glossary, security rules, service map, features, ADRs
- Health scoring, drift detection, linting — all work without any agent
- CI workflow posts health comments on PRs — no agent involved
- MCP server speaks JSON-RPC 2.0 — the protocol standard that Cursor, Windsurf, and Cline already support

### The integration layer is Claude-only

| Component | Claude coupling |
|-----------|----------------|
| `CLAUDE.md` | Other agents ignore this file |
| `.claude/commands/*.md` | Claude-specific interactive prompts |
| `.claude/skills/*/SKILL.md` | Claude-specific auto-triggers |
| `.claude/hooks/post-push-doc-check.sh` | Claude's PostToolUse system |
| `.claude/settings.json` MCP config | Claude's MCP registration format |
| `forgedocs install` | Writes exclusively to `.claude/` |
| `lib/health.mjs` | 5 points for CLAUDE.md, 0 for `.cursorrules` |
| `lib/lint.mjs` rules 8-10 | Hardcoded to CLAUDE.md structure |

A developer using Cursor gets the docs and the CI checks, but not the MCP server, not the instruction file, not the maintenance loop.

### Design constraint: map, not manual

Forgedocs is built on two ideas (ADR 004):

1. **matklad's ARCHITECTURE.md** — a map, not a manual
2. **OpenAI's Harness Engineering** — agents don't hallucinate, they navigate

The progressive disclosure pyramid enforces this:

```
Instruction file   ← Where to look. ~50 lines. Pointers, not content.
ARCHITECTURE.md    ← The map. Codemap, data flow, invariants.
docs/              ← Reference. Glossary, security, service map, ADRs.
docs/features/     ← Deep dives. Complex features with invariants.
code               ← The source of truth.
```

**The instruction file (CLAUDE.md today) is a pointer to the documentation, not a copy of it.** It tells the agent where to look. The MCP server gives the agent structured access to the actual content. This separation is the reason docs don't drift — there's one source of truth (ARCHITECTURE.md + docs/), and everything else navigates to it.

Any multi-agent design must preserve this: instruction files stay short (~50 lines), point to docs, and let MCP handle structured queries.

## How it works

### Each agent gets two things

**1. An instruction file** — a short navigation document in the agent's native format, equivalent to what CLAUDE.md is for Claude Code:

| Agent | File | Format |
|-------|------|--------|
| Claude Code | `CLAUDE.md` | Markdown with standard sections |
| Cursor | `.cursor/rules/forgedocs.mdc` | MDC with YAML frontmatter |
| Windsurf | `.windsurfrules` | Markdown rules |
| GitHub Copilot | `.github/copilot-instructions.md` | Markdown instructions |
| Cline | `.clinerules` | Markdown rules |

Every instruction file follows the same structure as CLAUDE.md — it's a map:

```
Read first       → points to ARCHITECTURE.md, glossary, security
Where things live → top-level directory purposes (not the full codemap)
What to never do  → 3-5 critical constraints + "see docs/security.md"
How to run        → test, lint, dev commands
Doc maintenance   → when to update which doc
MCP available     → what tools the agent can call
```

~50 lines. No codemap duplication. No security rules duplication. No glossary embedding. The agent reads the pointer, then navigates to the real content — or queries MCP.

**2. MCP server registration** — for agents that support it (Claude, Cursor, Windsurf, Cline):

| Agent | Config file | Format |
|-------|-------------|--------|
| Claude Code | `.claude/settings.json` | `mcpServers.forgedocs` (already done) |
| Cursor | `.cursor/mcp.json` | `mcpServers.forgedocs` |
| Windsurf | `.windsurf/mcp.json` | `mcpServers.forgedocs` |
| Cline | `.cline/mcp.json` | `mcpServers.forgedocs` |

The MCP server is unchanged — it already speaks standard JSON-RPC 2.0 and returns structured JSON. The 10 tools (list_services, search_docs, check_drift, get_codemap, query_docs, etc.) work identically regardless of which agent calls them. Only the registration differs.

Copilot doesn't support repo-level MCP, so it relies on the instruction file + CI checks only.

### What Claude Code keeps exclusively

Claude Code's integration goes deeper than other agents because it supports commands, skills, and hooks:

- `.claude/commands/` — 8 interactive doc workflows (doc-init, doc-sync, etc.)
- `.claude/skills/` — 2 auto-triggered skills (doc-audit, doc-review)
- `.claude/hooks/` — post-push doc check

These remain Claude-only. Other agents can't run multi-step interactive prompts (Cursor/Windsurf/Copilot) or auto-trigger workflows. This is fine — the MCP server bridges the gap. A Cursor agent that calls `check_drift` → `suggest_updates` achieves the same outcome as `/doc-sync`, just without the guided workflow.

### Three levels of standards enforcement

```
Level 1 — Agent context (preventive, immediate)
  Agent reads instruction file at startup → knows constraints before code is written.
  Agent queries MCP for structured rules → gets invariants, security rules, codemap.
  Works for: all agents with instruction files + MCP.

Level 2 — Local checks (reactive, on-demand)
  Developer or agent runs `forgedocs check` → lint + drift + score.
  Works for: everyone (CLI is agent-agnostic).

Level 3 — CI gates (safety net, on PR)
  doc-freshness.yml posts health comment on PR.
  Works for: everyone (CI is agent-agnostic).
```

Today Level 1 exists only for Claude. This ADR adds it for all agents.

## Implementation

### New module: `lib/agents.mjs`

Agent registry with detection, conventions, and capabilities:

```js
export const agents = {
  claude: {
    name: 'Claude Code',
    instructionFile: 'CLAUDE.md',
    mcpConfig: { path: '.claude/settings.json', format: 'claude-settings' },
    supports: { commands: true, skills: true, hooks: true, mcp: true },
    detect: (dir) => hasDir(dir, '.claude'),
  },
  cursor: {
    name: 'Cursor',
    instructionFile: '.cursor/rules/forgedocs.mdc',
    mcpConfig: { path: '.cursor/mcp.json', format: 'simple-mcp' },
    supports: { commands: false, skills: false, hooks: false, mcp: true },
    detect: (dir) => hasDir(dir, '.cursor') || hasFile(dir, '.cursorrules'),
  },
  windsurf: {
    name: 'Windsurf',
    instructionFile: '.windsurfrules',
    mcpConfig: { path: '.windsurf/mcp.json', format: 'simple-mcp' },
    supports: { commands: false, skills: false, hooks: false, mcp: true },
    detect: (dir) => hasDir(dir, '.windsurf') || hasFile(dir, '.windsurfrules'),
  },
  copilot: {
    name: 'GitHub Copilot',
    instructionFile: '.github/copilot-instructions.md',
    mcpConfig: null,
    supports: { commands: false, skills: false, hooks: false, mcp: false },
    detect: (dir) => hasFile(dir, '.github/copilot-instructions.md'),
  },
  cline: {
    name: 'Cline',
    instructionFile: '.clinerules',
    mcpConfig: { path: '.cline/mcp.json', format: 'simple-mcp' },
    supports: { commands: false, skills: false, hooks: false, mcp: true },
    detect: (dir) => hasDir(dir, '.cline') || hasFile(dir, '.clinerules'),
  },
}
```

Adding a new agent = one new entry + one renderer function. No changes to core modules.

### New module: `lib/instruction-gen.mjs`

Generates instruction files for each agent. Not a content inliner — a pointer builder.

Reads:
- Project name (from package.json / go.mod / Cargo.toml / dirname)
- Top-level directories (from filesystem)
- Which docs exist (ARCHITECTURE.md, docs/glossary.md, etc.)
- Run commands (from package.json scripts / Makefile / go.mod)
- The 3-5 most critical constraints (from CLAUDE.md "What to never do" if it exists, otherwise a sensible default)
- MCP availability (is forgedocs installed?)

Produces: a short (~50 line) navigation document per agent, in that agent's native format.

**What it does NOT do**: parse and embed codemap tables, security rules, glossary terms, ADR rules, or invariant commands. Those stay in ARCHITECTURE.md and docs/ where they belong. The MCP server serves them on demand.

### Modified: `lib/installer.mjs`

New `agents` option:

```js
installTemplates(templatesDir, targetRepo, {
  force: false,
  dryRun: false,
  agents: ['claude', 'cursor'],  // NEW — which agents to install for
})
```

For each agent:
1. Generate and write instruction file (via instruction-gen.mjs)
2. Register MCP server in agent's config (if agent supports MCP)
3. Install agent-specific extras (commands/skills/hooks for Claude only)
4. Install shared assets (CI workflow, PR template — once, not per agent)

Default: `agents: 'auto'` — detect agents present in the repo, fall back to `['claude']`.

### New CLI command: `forgedocs sync-agents`

```
forgedocs sync-agents [path] [--agents <list>] [--dry-run] [--json]
```

Regenerates instruction files for all installed agents. Detects which agents are installed by checking which instruction files exist, then regenerates them from current project state.

Use cases:
- After modifying ARCHITECTURE.md (directory structure changed)
- After adding/removing docs (new glossary, security file, etc.)
- After changing package.json scripts (test/lint commands changed)
- Automated via doc-audit skill (Claude) or CI

### Modified: `lib/health.mjs`

Check `id: 'claude'` (5 pts for CLAUDE.md) becomes `id: 'agent-instructions'` (5 pts if ANY agent instruction file exists).

### Modified: `lib/lint.mjs`

Rules 8-10 (CLAUDE.md structure/length/presence) apply to whichever agent instruction files exist. Section requirements adapted per agent format.

New rule: `agent-instruction-stale` — warning if the instruction file references directories or commands that don't match current project state. Suggests `forgedocs sync-agents`.

### CLI flag: `--agents`

Added to `install` and `quickstart`:

```bash
forgedocs install ~/my-project --agents claude,cursor
forgedocs quickstart . --agents auto
forgedocs quickstart . --agents all
```

Values: agent names (comma-separated), `auto` (detect, default claude), `all` (every supported agent).

## User flows

### External contributor onboards (Cursor)

1. Clones repo. Opens in Cursor.
2. Cursor reads `.cursor/rules/forgedocs.mdc` → knows where to look, what to never do, how to test.
3. `.cursor/mcp.json` registers forgedocs MCP → Cursor can call `search_docs`, `check_drift`, `suggest_updates`.
4. Contributor codes. Cursor calls `check_drift` → sees issues → helps fix docs.
5. PR → CI doc-freshness → health comment → merge.

### Continuous maintenance (any agent)

```
Developer changes code
    │
    ├─ Claude user:
    │    doc-audit skill triggers → /doc-sync → docs updated
    │
    ├─ Cursor/Windsurf/Cline user:
    │    instruction file says "after structural changes, update ARCHITECTURE.md"
    │    MCP check_drift → sees drift → agent helps fix
    │
    ├─ Copilot user:
    │    instruction file has maintenance rules
    │    no MCP, but CI catches drift on PR
    │
    └─ No agent:
         npx forgedocs check . → sees drift → fixes manually
         CI catches anything missed
```

### Instruction files drift from docs

```bash
$ npx forgedocs sync-agents
  Detected installed agents: claude, cursor, copilot

  Updated:
    CLAUDE.md                        (new directory added to "Where things live")
    .cursor/rules/forgedocs.mdc      (same update in Cursor format)
    .github/copilot-instructions.md  (same update in Copilot format)
```

## Rules

- Instruction files are maps, not manuals — ~50 lines, pointers to docs, never inline content from ARCHITECTURE.md or docs/
- The MCP server is the structured data layer — agents that need codemap, invariants, or security rules query MCP, not the instruction file
- ARCHITECTURE.md + docs/ remain the single source of truth — instruction files are generated navigation views
- Adding a new agent requires only a registry entry + renderer — no changes to core modules
- `forgedocs install` without `--agents` auto-detects, defaults to `['claude']`
- Zero new runtime dependencies
<!-- check: grep -r "process.exit" lib/agents.mjs lib/instruction-gen.mjs 2>/dev/null | wc -l → should be 0 -->

## Trade-offs

- **More dotfiles in repos** — mitigated by only generating for detected agents, not all 5
- **Renderer maintenance** — each agent format may evolve; renderers are simple (~50 lines each) and isolated
- **Copilot has no MCP** — relies on instruction file + CI only; still better than nothing
- **Claude keeps exclusive features** — commands/skills/hooks don't port to other agents; MCP bridges the capability gap
- **Instruction files can still drift** — `sync-agents` command + lint rule detect it; doc-audit skill automates it for Claude users
