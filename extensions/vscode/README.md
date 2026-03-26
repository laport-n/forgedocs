# Forgedocs for VS Code

Architecture documentation health monitoring right in your editor.

## Features

- **Status Bar Score** — see your doc health score at a glance (click for details)
- **Sidebar Panel** — browse all documentation files (ARCHITECTURE.md, features, ADRs)
- **Drift Detection** — get notified when code changes may require doc updates
- **Quick Navigation** — open any doc file with one click

## Activation

The extension activates automatically when your workspace contains an `ARCHITECTURE.md` file.

## Commands

| Command | Description |
|---------|-------------|
| `Forgedocs: Show Doc Health Score` | Display detailed health score breakdown |
| `Forgedocs: Check Documentation Drift` | Run drift detection in terminal |
| `Forgedocs: Open ARCHITECTURE.md` | Open the architecture document |
| `Forgedocs: Open in Doc Site` | Open localhost:5173 in browser |

## Requirements

- [Forgedocs](https://www.npmjs.com/package/forgedocs) installed (`npm i -g forgedocs`)
- A workspace with `ARCHITECTURE.md`

## License

MIT
