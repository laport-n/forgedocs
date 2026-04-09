# 006 — Multi-Agent Documentation Support

**Status:** Proposed
**Date:** 2026-04-09

## Context

Forgedocs produces high-quality documentation that any AI agent can *read* (ARCHITECTURE.md, docs/, glossary, etc.), but the integration layer — commands, skills, hooks, instruction files, MCP registration — only works with Claude Code. Teams using Cursor, Windsurf, GitHub Copilot, Cline, or mixed toolchains get the docs but not the maintenance loop.

This ADR proposes extending forgedocs so that the full lifecycle — scaffolding, continuous maintenance, drift detection, standards enforcement — works regardless of which AI coding agent a developer uses.

### What we already have (agent-agnostic)

- **Documentation structure**: ARCHITECTURE.md, docs/, glossary, security, service-map, features, ADRs
- **Verification tools**: `forgedocs score`, `diff`, `lint`, `check`, `audit`
- **CI workflow**: `doc-freshness.yml` runs on PRs, posts health comments — no agent involved
- **MCP server**: JSON-RPC 2.0 over stdio — the protocol is already an industry standard
- **PR template**: Checklist for doc updates — agent-agnostic
- **VitePress site**: Doc viewer — agent-agnostic
- **Health scoring**: 0-100 score — agent-agnostic

### What is Claude Code-only today

| Component | Claude coupling | Why it matters |
|-----------|----------------|----------------|
| `CLAUDE.md` | Named for Claude, expected by Claude | Other agents ignore this file |
| `.claude/commands/*.md` | Claude command format | No equivalent for Cursor/Copilot |
| `.claude/skills/*/SKILL.md` | Claude skill format | No equivalent for other agents |
| `.claude/hooks/post-push-doc-check.sh` | PostToolUse hook in Claude settings | Other agents have different hook systems |
| `.claude/settings.json` MCP config | Claude's MCP registration format | Cursor/Windsurf/Cline have their own MCP config |
| `forgedocs install` | Writes exclusively to `.claude/` | Does nothing for non-Claude users |
| `lib/health.mjs` `claude` check | 5 points for CLAUDE.md presence | Should reward any agent instruction file |
| `lib/lint.mjs` rules 8-10 | Lint CLAUDE.md structure | Should lint any agent instruction file |
| `lib/quickstart.mjs` | Generates CLAUDE.md only | Should generate for detected agents |

## What — The Design

### Core principle: One source of truth, N agent outputs

The documentation structure (ARCHITECTURE.md, docs/) is already universal. The missing piece is a **generation layer** that produces agent-specific integration files from the project's documentation.

```
                    ARCHITECTURE.md + docs/ + config
                              │
                    ┌─────────┼─────────────┐
                    ▼         ▼              ▼
              CLAUDE.md   .cursor/rules/  .github/copilot-
              .claude/    forgedocs.mdc   instructions.md
              settings    .cursor/mcp.json
              commands    
              skills    .windsurfrules    .clinerules
              hooks     .windsurf/mcp.json .cline/mcp.json
```

### Agent registry

A new `lib/agents.mjs` module defines each agent's conventions:

```js
export const agents = {
  claude: {
    name: 'Claude Code',
    instructionFile: 'CLAUDE.md',
    configDir: '.claude',
    mcpConfigPath: '.claude/settings.json',
    supportsCommands: true,    // interactive multi-step prompts
    supportsSkills: true,      // auto-triggered workflows
    supportsHooks: true,       // PostToolUse hooks
    supportsMcp: true,
    detectPresence: (dir) => exists(dir, '.claude'),
  },
  cursor: {
    name: 'Cursor',
    instructionFile: '.cursor/rules/forgedocs.mdc',
    configDir: '.cursor',
    mcpConfigPath: '.cursor/mcp.json',
    supportsCommands: false,   // rules are always-on context, not commands
    supportsSkills: false,
    supportsHooks: false,
    supportsMcp: true,
    detectPresence: (dir) => exists(dir, '.cursor') || exists(dir, '.cursorrules'),
  },
  windsurf: {
    name: 'Windsurf',
    instructionFile: '.windsurfrules',
    configDir: '.windsurf',
    mcpConfigPath: '.windsurf/mcp.json',
    supportsCommands: false,
    supportsSkills: false,
    supportsHooks: false,
    supportsMcp: true,
    detectPresence: (dir) => exists(dir, '.windsurfrules') || exists(dir, '.windsurf'),
  },
  copilot: {
    name: 'GitHub Copilot',
    instructionFile: '.github/copilot-instructions.md',
    configDir: '.github',
    mcpConfigPath: null,       // Copilot MCP is VS Code-level, not repo-level
    supportsCommands: false,
    supportsSkills: false,
    supportsHooks: false,
    supportsMcp: false,        // no repo-level MCP config
    detectPresence: (dir) => exists(dir, '.github/copilot-instructions.md'),
  },
  cline: {
    name: 'Cline',
    instructionFile: '.clinerules',
    configDir: '.cline',
    mcpConfigPath: '.cline/mcp.json',
    supportsCommands: true,    // Cline supports custom commands
    supportsSkills: false,
    supportsHooks: false,
    supportsMcp: true,
    detectPresence: (dir) => exists(dir, '.cline') || exists(dir, '.clinerules'),
  },
}
```

### What each agent gets

| Capability | Claude | Cursor | Windsurf | Copilot | Cline |
|------------|--------|--------|----------|---------|-------|
| **Instruction file** | CLAUDE.md | .cursor/rules/forgedocs.mdc | .windsurfrules | copilot-instructions.md | .clinerules |
| **MCP server** | .claude/settings.json | .cursor/mcp.json | .windsurf/mcp.json | — | .cline/mcp.json |
| **Interactive commands** | .claude/commands/ | — | — | — | .cline/commands/ |
| **Auto-triggered skills** | .claude/skills/ | — | — | — | — |
| **Post-push hook** | PostToolUse hook | — | — | — | — |
| **CI workflow** | doc-freshness.yml | doc-freshness.yml | doc-freshness.yml | doc-freshness.yml | doc-freshness.yml |
| **PR template** | doc checklist | doc checklist | doc checklist | doc checklist | doc checklist |
| **Standards in context** | via CLAUDE.md | via .mdc rules | via .windsurfrules | via instructions.md | via .clinerules |

### Instruction file content model

All instruction files are generated from the same intermediate representation:

```js
{
  projectName: 'my-api',
  readFirst: ['ARCHITECTURE.md', 'docs/glossary.md', 'docs/security.md'],
  codeLayout: [
    { path: 'src/routes/', purpose: 'HTTP route handlers' },
    { path: 'src/services/', purpose: 'Business logic' },
    // ...from ARCHITECTURE.md codemap
  ],
  constraints: [
    'Never commit .env files or hardcoded secrets',
    'All new modules must be added to ARCHITECTURE.md codemap',
    // ...from docs/security.md + CLAUDE.md "What to never do"
  ],
  commands: {
    test: 'npm test',
    lint: 'npm run lint',
    dev: 'npm run dev',
  },
  docMaintenanceRules: [
    'After structural changes → update ARCHITECTURE.md codemap',
    'After API changes → update docs/service-map.md',
    // ...
  ],
  mcpAvailable: true,
  mcpTools: ['list_services', 'search_docs', 'check_drift', ...],
}
```

Each agent renderer transforms this model into its native format:
- **Claude**: Markdown with "What to read first" / "Where things live" / "What to never do" / "How to run" sections
- **Cursor**: MDC format with YAML frontmatter, `@`-tagged file references, always-on rules
- **Windsurf**: Markdown with project rules and conventions
- **Copilot**: Concise markdown (Copilot has context limits), focused on constraints and code layout
- **Cline**: Markdown rules file with project context

## How it works — User flows

### Flow 1: First setup (new project)

```
$ npx forgedocs quickstart .
  Detected: express (Node.js)
  Detected agents: Claude Code, Cursor (2 team members)

  Created:
    ARCHITECTURE.md          ← universal system map
    docs/glossary.md         ← domain vocabulary
    docs/security.md         ← security rules
    docs/service-map.md      ← dependencies

  Generated for Claude Code:
    CLAUDE.md                ← agent instructions
    .claude/commands/        ← 8 doc commands
    .claude/skills/          ← 2 auto-triggers
    .claude/hooks/           ← post-push check
    .claude/settings.json    ← MCP server

  Generated for Cursor:
    .cursor/rules/forgedocs.mdc  ← project rules
    .cursor/mcp.json             ← MCP server

  CI:
    .github/workflows/doc-freshness.yml
    .github/PULL_REQUEST_TEMPLATE.md
```

The `--agents` flag overrides auto-detection: `forgedocs quickstart . --agents claude,cursor,copilot`

### Flow 2: External contributor onboards

A new contributor clones the repo. They use Cursor. They open the project.

1. Cursor reads `.cursor/rules/forgedocs.mdc` automatically — the agent now knows:
   - What files to read first (ARCHITECTURE.md, glossary)
   - Where things live (codemap from ARCHITECTURE.md)
   - What to never do (constraints from security.md + project rules)
   - How to run tests and linting
   - That an MCP server is available for doc queries

2. `.cursor/mcp.json` auto-registers the forgedocs MCP server — Cursor can now:
   - Search all docs with `search_docs`
   - Check drift with `check_drift`
   - Get health score with `get_health_score`

3. The contributor makes changes. They open a PR.

4. CI runs `doc-freshness.yml` — posts a health comment on the PR showing:
   - Score before/after
   - Any new drift
   - Lint errors

5. The PR template checklist reminds them to update docs.

**Result**: The contributor gets the same quality guardrails as a Claude Code user, with zero extra setup.

### Flow 3: Continuous maintenance (any agent)

```
Developer changes code
       │
       ├─ Claude Code user:
       │    └─ doc-audit skill auto-triggers
       │    └─ "3 drift items detected, run /doc-sync"
       │    └─ /doc-sync updates ARCHITECTURE.md
       │
       ├─ Cursor user:
       │    └─ Rules file reminds: "after structural changes, update ARCHITECTURE.md"
       │    └─ MCP server available: agent runs check_drift, sees issues
       │    └─ Agent updates docs based on drift report
       │
       ├─ Copilot user:
       │    └─ instructions.md includes maintenance rules
       │    └─ No MCP, but CI catches drift on PR
       │
       └─ Any user (no agent):
            └─ Runs `npx forgedocs check .` manually
            └─ CI catches drift on PR
            └─ PR template checklist
```

### Flow 4: Standards enforcement across the team

The constraints defined in the project docs get embedded in every agent's instruction file:

```
docs/security.md says:
  "Never use eval() or new Function()"
  "All API endpoints require authentication"

This becomes:
  CLAUDE.md:     "## What to never do\n- Never use eval()..."
  .cursorrules:  "## Project Rules\n- Never use eval()..."
  copilot-instructions.md: "## Constraints\n- Never use eval()..."
```

When a contributor (using any agent) writes code that violates these rules:
1. Their agent sees the constraint in context and warns them
2. `forgedocs lint` catches security.md violations in source code (rule 13)
3. CI surfaces lint errors on the PR

### Flow 5: Keeping instruction files in sync

When the project's documentation changes, instruction files can drift. Solution:

```
$ npx forgedocs sync-agents
  Reading ARCHITECTURE.md codemap... 12 modules
  Reading docs/security.md constraints... 8 rules
  Reading project config...

  Updated:
    CLAUDE.md                        ← codemap refreshed, 1 new constraint
    .cursor/rules/forgedocs.mdc      ← same updates in Cursor format
    .github/copilot-instructions.md  ← same updates in Copilot format

  No changes:
    .windsurfrules (not installed)
```

This command can be:
- Run manually after doc changes
- Added to the doc-audit skill (Claude auto-triggers it)
- Added to CI as a drift check

## Implementation plan

### Phase 1 — Agent abstraction layer

**New files:**
- `lib/agents.mjs` — Agent registry (detection, conventions, capabilities)
- `lib/instruction-gen.mjs` — Reads project docs → intermediate model → agent-specific files

**Modified files:**
- `lib/installer.mjs` — Accept `agents` option, delegate to agent-specific installers
- `lib/health.mjs` — `claude` check → `agent-instructions` check (any instruction file = 5 pts)
- `lib/lint.mjs` — CLAUDE.md rules generalized to any instruction file
- `bin/forgedocs.mjs` — `--agents` flag on `install` and `quickstart`

**New templates:**
```
templates/
├── claude/          (renamed from claude-commands/, claude-skills/, claude-hooks/)
│   ├── commands/
│   ├── skills/
│   └── hooks/
├── cursor/
│   └── rules/forgedocs.mdc.ejs
├── windsurf/
│   └── windsurfrules.ejs
├── copilot/
│   └── copilot-instructions.md.ejs
├── cline/
│   └── clinerules.ejs
├── _shared/         (prompt content reusable across agents)
│   ├── doc-workflows.md
│   └── maintenance-rules.md
└── github-workflows/ (unchanged)
```

### Phase 2 — MCP multi-registration

The MCP server is already agent-agnostic (JSON-RPC 2.0). Only the registration changes:

- Claude: `.claude/settings.json` → `mcpServers.forgedocs`
- Cursor: `.cursor/mcp.json` → `mcpServers.forgedocs`
- Windsurf: `.windsurf/mcp.json` → `mcpServers.forgedocs`
- Cline: `.cline/mcp.json` → `mcpServers.forgedocs`

Each format is slightly different but the command is always `npx forgedocs mcp`.

### Phase 3 — `sync-agents` command

New CLI subcommand that regenerates all instruction files from current project docs:

```
forgedocs sync-agents [path] [--agents <list>] [--dry-run]
```

Reads: ARCHITECTURE.md codemap + docs/security.md + docs/glossary.md + project config
Writes: Instruction files for each configured agent

### Phase 4 — Lint and health generalization

- Health check: "Has agent instruction file" = 5 pts if ANY of CLAUDE.md, .cursorrules, etc. exists
- Lint rules: Apply instruction file structure checks to whichever files exist
- New lint rule: "agent-instruction-drift" — checks if instruction files are in sync with ARCHITECTURE.md codemap

### Phase 5 — Documentation and examples

- Update README.md: Multi-agent support section, per-agent setup guides
- Update ARCHITECTURE.md: New modules in codemap
- New doc: `docs/features/multi-agent.md`
- Update examples: Add `.cursorrules` and `copilot-instructions.md` to sample-repo

## Rules

- The documentation structure (ARCHITECTURE.md, docs/) must remain the single source of truth — agent instruction files are generated outputs
- Adding a new agent must require only a new entry in the agent registry + a renderer — no changes to core modules
- `forgedocs install` without `--agents` must auto-detect agents present in the repo and default to claude if none are detected
- The MCP server must remain agent-agnostic — it serves any MCP client identically
- Instruction file generation must be deterministic — same input docs → same output files
<!-- check: node -e "const a = await import('./lib/agents.mjs'); console.log(Object.keys(a.agents).length)" → should be >= 5 -->

## Trade-offs

- **More files in repos**: Multi-agent support means more dotfiles (.cursorrules, .windsurfrules, etc.) — mitigated by only generating for detected agents
- **Maintenance surface**: Each agent renderer needs updating when agent formats change — mitigated by keeping renderers simple (template-based, not code-heavy)
- **Lowest common denominator risk**: Agents have different capabilities (Claude has commands, Cursor has always-on rules) — mitigated by the capability flags in the registry, giving each agent the best experience its format allows
- **CLAUDE.md name**: Keeping CLAUDE.md as the Claude instruction file (vs a generic name) maintains compatibility with existing Claude Code installations
- **Template complexity**: EJS templates for each agent add maintenance burden — but they're simple string interpolation, not logic-heavy
