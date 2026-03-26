# Service Map

Last verified: 2026-03-26

## Components

Forgedocs is a self-contained local tool. It has no external service dependencies.

```
┌─────────────────────────────────────────────────┐
│                  User's machine                  │
│                                                  │
│  ┌──────────┐     ┌───────────┐     ┌─────────┐ │
│  │ forgedocs│────→│ .repos.json│────→│ content/│ │
│  │   CLI    │     │           │     │symlinks │ │
│  └────┬─────┘     └───────────┘     └────┬────┘ │
│       │                                  │      │
│       │ install                          │      │
│       ▼                                  ▼      │
│  ┌──────────┐                    ┌────────────┐ │
│  │ templates/│                   │  VitePress  │ │
│  │ commands  │                   │  dev server │ │
│  │ skills    │                   │  :5173      │ │
│  │ workflows │                   └────────────┘ │
│  └──────────┘                                   │
│       │                                         │
│       ▼                                         │
│  ┌──────────────┐                               │
│  │ Target repos  │                               │
│  │ .claude/      │                               │
│  │ .github/      │                               │
│  └──────────────┘                               │
└─────────────────────────────────────────────────┘
```

## Data flow

| From | To | What | Protocol |
|------|----|------|----------|
| CLI | filesystem | Scan for repos, create symlinks | `fs` module |
| CLI | VitePress | Start dev/build via `npx vitepress` | child_process |
| CLI | target repos | Copy command templates | `fs.copyFileSync` |
| VitePress | content/ symlinks | Read markdown files | filesystem |
| GitHub Actions | target repo | Run doc-freshness checks on PRs | CI workflow |
