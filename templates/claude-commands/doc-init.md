# /doc-init

You are a documentation bootstrapper. Your job is to generate a complete documentation structure for the current repository, following the conventions expected by [forgedocs](https://github.com/laport-n/forgedocs).

## Requirements

The repo must be a working codebase (not empty). You will explore the code to generate meaningful docs — never generate placeholder content.

## Process — follow these steps in order

### Step 0 — Detect the tech stack

Before anything else, identify the project's technology stack. Do NOT assume any particular language or framework.

1. **Find the manifest file.** Look for: `package.json`, `Gemfile`, `pyproject.toml`, `setup.py`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`, `build.sbt`, `mix.exs`, `composer.json`, `*.csproj`, or similar. Read it to determine the primary language, framework, and key dependencies.

2. **Find the source root.** List the top-level directories. Identify the primary source directory — it could be `src/`, `app/`, `lib/`, `pkg/`, `internal/`, `cmd/`, or any language-specific convention. Note all directories that contain application code.

3. **Identify the architectural style.** Read config files, entry points, and directory structure to determine:
   - Framework (Rails, Express, Django, Spring, Gin, Phoenix, Next.js, etc.) or frameworkless
   - Module/domain organization (bounded contexts, feature folders, layered, hexagonal, etc.)
   - Background job system (if any)
   - ORM/data layer (if any)
   - Inter-service communication patterns (REST, gRPC, GraphQL, message queues, events)

4. **Map the vocabulary.** Throughout the rest of this process, adapt terminology to match this project:
   - "dependency" — gem, package, crate, module, etc.
   - "module" — domain, bounded context, package, crate, namespace, etc.
   - "worker" — job, task, consumer, handler, etc.
   - "model" — entity, struct, schema, type, etc.
   - "tests" — spec, test, __tests__, *_test.*, etc.

Use the detected stack and vocabulary for ALL subsequent steps. Never reference technologies that are not present in this project.

### Step 1 — Understand the repo

Explore the codebase thoroughly:
- Read `README.md` if it exists
- Read the manifest file detected in Step 0
- Read the main config files (routing, entry points, initializers, environment config)
- List the directory structure under the detected source root
- Identify the main domains/modules, their responsibilities, and relationships
- Check for existing documentation (any `.md` files)

Ask the user: "I've explored the codebase. Here's what I found: [summary]. Should I proceed with generating the documentation?"

### Step 2 — Create or improve README.md

`README.md` is **required** — it's the home page of the service in the documentation site. Without it, the service gets a 404.

**If README.md does not exist**, create it with:
- **Title**: service name as `# heading`
- **Overview**: 2-3 sentences explaining what this service does (from what you learned in Step 1)
- **Setup**: how to install dependencies and run the project locally (from manifest file, Dockerfile, or config)
- **Development**: how to run tests, linting, and other common dev commands
- **Deployment**: brief deployment notes if visible from CI config, Dockerfile, or scripts
- **Architecture**: a one-liner pointing to `ARCHITECTURE.md` for details

**If README.md exists but is minimal** (less than 20 lines, or missing Setup/Development sections), improve it:
- Add missing sections (Setup, Development, Deployment) by reading the manifest file and scripts
- Don't remove existing content — only add what's missing
- Ask the user before making changes: "Your README.md is missing [sections]. Should I add them?"

**If README.md exists and is comprehensive**, leave it as-is.

### Step 3 — Generate ARCHITECTURE.md

Create `ARCHITECTURE.md` at the repo root following the matklad style. This file serves both humans and AI agents — it's loaded into the agent's context via CLAUDE.md, making the agent aware of system structure, invariants, and constraints:
- **Overview**: What this service does, in 2-3 sentences
- **Codemap**: Each major module under the detected source root, what it does, and key types/files to know about. Name files, don't link them.
- **Data flow**: Trace one representative request path from entry point to persistence to side effects, using the actual layers present in this project.
- **Architectural invariants**: Rules that must never be broken. Extract these from the code patterns you observe. **Each invariant must include a verification command** — a grep, find, or shell one-liner that returns 0 (or empty output) when the invariant holds, and non-empty output when violated. Format as a table:

```markdown
| Invariant | Verification |
|-----------|-------------|
| All mutations go through Commands | `grep -r "\.save\|\.update\|\.create" app/controllers/ \| wc -l` → should be 0 |
| No heavy work in webhook controllers | `grep -r "External::Client" app/controllers/api/ \| wc -l` → should be 0 |
```

These checks will be executed automatically by `/doc-review`. If you cannot devise a check for an invariant, mark it as `[manual review]`.
- **Inter-service communication**: How this service talks to others (REST, gRPC, webhooks, queues, events, etc.)
- **Cross-cutting concerns**: Auth, observability, multi-tenancy, error handling

Keep it concise (~100-150 lines). This is a map, not a manual.

### Step 4 — Generate CLAUDE.md

Create `CLAUDE.md` at the repo root. This file is **read by AI coding agents at the start of every session** — it makes the agent smarter about this codebase. Navigation-first, not description-first:

```markdown
# [Service Name]

## What to read first
- `ARCHITECTURE.md` — system map, data flows, and verifiable invariants
- `docs/glossary.md` — domain vocabulary before touching anything
- `docs/security.md` — before any sensitive data or auth change
- `docs/service-map.md` — before adding or modifying inter-service calls

## Where things live
- [list key directories and what they contain]

## What to never do
- [extract from code patterns — things that would break invariants]

## How to run
- [tests, server, linting commands]

## When to update documentation
- Adding/removing a bounded context → update `ARCHITECTURE.md` codemap
- New architectural decision → create `docs/adr/NNN-*.md`
- New/changed inter-service communication → update `docs/service-map.md`
- New auth mechanism or sensitive data handling → update `docs/security.md`
- New domain vocabulary → update `docs/glossary.md`
- New complex feature → create `docs/features/<name>.md`
```

### Step 5 — Generate docs/ directory

Create the following files:

**`docs/glossary.md`** — Extract domain vocabulary from:
- Model/entity/type names and their attributes
- Enum values
- Constant names
- Comments and README content
- Group by category (entities, states, operations, external concepts)

**`docs/service-map.md`** — Document inter-service communication:
- Find HTTP client libraries in the project's dependencies
- Find message/event publishers and subscribers (if any)
- Find webhook endpoints (if any)
- Find async job/queue consumers (if any)
- Draw a Mermaid diagram showing the relationships
- Add a `Last verified: YYYY-MM-DD` date at the top

**`docs/security.md`** — Extract security-relevant patterns:
- Authentication mechanisms (JWT, OAuth, API keys)
- Sensitive data handling (PAN, PII, tokens)
- Webhook signature verification
- Encryption patterns
- Authorization/RBAC if present
- Frame as "10 rules" that any developer must follow

**`docs/adr/`** — Architecture Decision Records. ADRs document **what is in place now and what rules to follow**, not a history of how we got here. You must **investigate actively** to understand each decision deeply enough to write useful, practical ADRs.

#### Step 5a — Detect and investigate decisions

For each potential decision, **dig into the actual source** before writing anything:

1. **Private/internal dependencies** (from a private registry, Git repository, or internal org):
   - Read the manifest file to identify the source (private registry URL, Git remote, org scope)
   - Try to read the dependency's README or source if vendored or locally accessible
   - If it's private and you can't access its source, **ask the user**: "I found the dependency `X` from `[source]` but I can't read its documentation. Can you share a link to its repo or briefly describe what it does?"

2. **Libraries and frameworks**:
   - Read how the library is actually used in the codebase — which features, which patterns, which config
   - Check git log for context: `git log --all --oneline -S "dependency_name" -- <manifest_file>`

3. **Architectural patterns**:
   - Read the base classes/types/traits that implement the pattern
   - Search for comments: grep for `why`, `note`, `hack`, `TODO`, `FIXME`, `WARNING`, `IMPORTANT`

4. **Infrastructure decisions**:
   - Read database config for replicas, connection pooling, multi-DB setup
   - Read job queue configuration for clustering, retries, reliability settings
   - Check CI/CD config for unusual steps or custom tooling
   - Look at Dockerfile and docker-compose for service dependencies

#### Step 5b — Ask the user when you can't access a source

After investigating, compile a list of things you **couldn't access or understand from the code alone**. Present them to the user in a batch and wait for answers before writing the ADRs.

#### Step 5c — Write ADRs

ADRs are **practical reference documents**, not historical essays. Focus on what a developer needs to know *today*.

Use this template — each ADR should be **25-40 lines**:

```markdown
# NNN — [Decision Title]

**Status:** Accepted
**Date:** [from git log or today]

## What

[2-3 sentences. What is this decision about? What tool/pattern/approach is in place?
Reference the specific files, config, or modules involved.]

## How it works

[Describe concretely how it works in this codebase. What are the key classes, config files, conventions?
A developer reading this should understand the mechanism well enough to use it correctly.]

## Rules

[Bullet list of practical rules to follow when working with this decision.
For each rule that can be verified automatically, add an HTML comment with a check command:
- Never use `destroy` on audit models — use `discard`
  <!-- check: grep -r "\.destroy" path/to/models/ | grep -v discard | wc -l → should be 0 -->
- All external calls must be traced
  <!-- check: grep -rL "Datadog\|tracing\|instrument" path/to/clients/ | wc -l → should be 0 -->
- Rules that can't be automated: no check comment needed]

## Trade-offs

[What constraints or limitations does this decision impose?
- What's harder because of it
- What breaks if you violate the rules above]
```

### Step 6 — Install Claude Code commands

Create `.claude/commands/` with 3 files copied from docsite templates:
- `doc-feature.md` — creates feature documentation
- `doc-sync.md` — checks if docs need updating after code changes
- `doc-review.md` — full documentation audit

Also create `.claude/skills/doc-review/SKILL.md` for the automated review skill.

### Step 7 — Update PR template

If `.github/PULL_REQUEST_TEMPLATE.md` exists, add the documentation checklist:

```markdown
## Documentation
- [ ] If structural change: `ARCHITECTURE.md` updated?
- [ ] If new architectural decision: ADR added in `docs/adr/`?
- [ ] If new security pattern: `docs/security.md` updated?
- [ ] If new inter-service communication: `docs/service-map.md` updated?
```

If it doesn't exist, create it with just this section.

### Step 8 — Summary

Show the user:
1. All files created (with line counts)
2. How to verify: "Run your docsite and check the new service appears"
3. What to review: "Check ARCHITECTURE.md invariants — I may have missed some"
4. Next steps: "Use `/doc-feature` to document complex features"

## Important rules

- **Never generate placeholder text.** Every sentence must come from what you observed in the code. If you can't determine something, write `[To be documented]`.
- **Never invent invariants.** Only document rules you can verify from the code patterns.
- **Keep ARCHITECTURE.md concise.** If it exceeds 150 lines, you're too detailed.
- **CLAUDE.md is navigation, not description.** It says "where to look", not "what the code does".
- **ADRs document the "now", not the "why we got here".** Focus on what's in place, how it works, and the rules to follow. Investigate actively (dependency sources, config files, base classes) before writing. If you can't access a source (private dependency), **ask the user for a link or description** rather than guessing. Each ADR must be 25-40 lines.
