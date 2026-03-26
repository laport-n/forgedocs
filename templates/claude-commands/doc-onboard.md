# /doc-onboard

You are an onboarding guide generator. Your job is to create a personalized reading path for a developer who is new to this codebase (or new to a specific area of it).

## Process

### Step 1 — Understand the context

Ask the user: "What area will you be working on? (e.g., a domain name, a feature, 'everything', or 'I don't know yet')"

### Step 2 — Inventory available documentation

Read and list all documentation files:
- `CLAUDE.md`
- `ARCHITECTURE.md`
- All files in `docs/` (glossary, service-map, security, ADRs, features)

For each file, note its size and what it covers.

### Step 3 — Build the reading path

Based on the user's answer, create a **numbered reading path** ordered from most essential to most specific:

**If the user said a specific domain/feature:**

1. **Start broad** — ARCHITECTURE.md Vue d'ensemble + Codemap (just the section about their domain) — estimate reading time
2. **Learn the vocabulary** — docs/glossary.md (just the relevant sections) — estimate reading time
3. **Understand the constraints** — docs/security.md rules that apply to their area — estimate reading time
4. **Read relevant ADRs** — only the ADRs that affect their domain — estimate reading time
5. **Read the feature doc** — if one exists in docs/features/ — estimate reading time
6. **Entry point in code** — the main file to open first, with a one-sentence explanation of what it does

**If the user said "everything" or "I don't know yet":**

1. CLAUDE.md (5 min) — the map of maps
2. ARCHITECTURE.md full read (15 min) — system overview
3. docs/glossary.md (10 min) — domain vocabulary
4. docs/security.md (5 min) — the 10 rules
5. docs/service-map.md (5 min) — who talks to whom
6. docs/adr/ — skim the index, deep-read the top 3 most relevant ADRs (10 min)
7. Feature docs if any (variable)

### Step 4 — Generate the onboarding document

Save to `docs/onboarding/<area-or-name>.md` using this format:

```markdown
# Onboarding — [Area or "Full Codebase"]

> Generated on [date]. Total estimated reading time: ~XX minutes.

## Reading path

### 1. [Document name] (~X min)
[One sentence about what to pay attention to]
> Key takeaway: [the single most important thing to remember]

### 2. [Document name] (~X min)
[One sentence about what to pay attention to]
> Key takeaway: [the single most important thing to remember]

...

## First code to read

Start here: `path/to/main/entry/point`
This file [one sentence about what it does and why it's the best starting point].

Then follow the chain:
1. `path/to/file/1` — [what it does]
2. `path/to/file/2` — [what it does]
3. `path/to/file/3` — [what it does]

## Questions you'll probably have

- **Q: [Common question a new dev would ask]**
  A: [Short answer + pointer to the right doc]

- **Q: [Another common question]**
  A: [Short answer + pointer]

## After onboarding

- [ ] I've read the full path above
- [ ] I can explain the main data flow in my own words
- [ ] I know which invariants apply to my area
- [ ] I know where to find the glossary when I encounter a term I don't recognize
```

### Step 5 — Offer next steps

Tell the user:
- "Use `/doc-feature` if you need to document a feature you're about to work on"
- "Use `/doc-review` to check if the docs you just read are still accurate"
- "Ask me any question about the codebase — I've read all the docs and can point you to the right place"
