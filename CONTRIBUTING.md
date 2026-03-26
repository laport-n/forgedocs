# Contributing to Docsite

Thanks for your interest in contributing! Docsite is an open-source tool for generating and maintaining architecture documentation that works for both humans and AI agents.

## Getting Started

### Prerequisites

- Node.js 18+
- At least one local repository with an `ARCHITECTURE.md` at its root (or create one to test)

### Development Setup

```bash
git clone https://github.com/nlaporte/docsite.git
cd docsite
npm install

# Create a test repo to work with
mkdir -p /tmp/test-repo && echo "# Test" > /tmp/test-repo/ARCHITECTURE.md && echo "# Test" > /tmp/test-repo/README.md
npm run setup -- --add /tmp/test-repo

npm run docs
# Open http://localhost:5173
```

### Running Tests

```bash
npm test
```

## How to Contribute

### Reporting Bugs

Open a [GitHub Issue](https://github.com/nlaporte/docsite/issues/new) with:
- Steps to reproduce
- Expected vs actual behavior
- Your OS, Node.js version, and shell

### Suggesting Features

Open a GitHub Issue with the `enhancement` label. Describe:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you considered

### Submitting Code

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Add tests if applicable
4. Ensure `npm test` passes
5. Open a Pull Request

### PR Guidelines

- Keep PRs focused — one feature or fix per PR
- Update documentation if your change affects user-facing behavior
- Follow the existing code style (no config file yet — just match what's there)

## Architecture

```
docsite/
├── .vitepress/config.ts    ← VitePress config with dynamic sidebar generation
├── scripts/
│   ├── setup.mjs           ← Repo auto-discovery and symlink management
│   └── install-commands.mjs ← Copies Claude Code commands into target repos
├── templates/
│   ├── claude-commands/     ← Command templates (doc-init, doc-feature, etc.)
│   └── claude-skills/       ← Skill templates (doc-review)
├── docsite.config.mjs       ← User configuration (title, GitHub URL, scan dirs)
├── index.md                 ← Landing page
└── content/                 ← Symlinks to local repos (gitignored)
```

### Key Design Decisions

- **Symlinks, not copies**: `content/` contains symlinks to real repos, so docs are always up to date and hot-reload works
- **Dynamic everything**: Sidebar, nav, and rewrites are generated at startup by scanning `content/`
- **No hardcoded services**: Any repo with `ARCHITECTURE.md` works
- **Config file**: `docsite.config.mjs` lets users customize without modifying source

## Code Style

- ES modules (`import`/`export`)
- Node.js built-in modules only (no external dependencies beyond VitePress)
- Clear console output with emoji for interactive scripts
- Graceful failures (catch and continue, don't crash)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
