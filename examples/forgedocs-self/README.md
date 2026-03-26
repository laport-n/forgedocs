# Forgedocs

Architecture documentation framework for codebases. Auto-discovers repos, renders docs with VitePress, and maintains them with AI-assisted commands.

## Quick Start

```bash
npm install -g forgedocs
forgedocs init
forgedocs dev
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `forgedocs init` | Interactive setup — discover repos, create symlinks |
| `forgedocs dev` | Start the documentation dev server |
| `forgedocs build` | Build static site |
| `forgedocs add <path>` | Add a specific repo |
| `forgedocs remove <name>` | Remove a repo |
| `forgedocs status` | Show tracked repos and doc coverage |
| `forgedocs install <path>` | Install Claude Code commands into a repo |
| `forgedocs doctor` | Diagnose common issues |
| `forgedocs help` | Show help |

## Requirements

- Node.js 20+
- One or more repos with an `ARCHITECTURE.md`

## License

MIT
