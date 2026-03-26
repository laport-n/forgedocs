# Contributing to Forgedocs

Thanks for your interest in contributing! Forgedocs is an open-source architecture documentation framework for codebases.

## Getting Started

### Prerequisites

- Node.js 20+
- A local repository with an `ARCHITECTURE.md` at its root (or create one to test)

### Development Setup

```bash
git clone https://github.com/laport-n/forgedocs.git
cd forgedocs
npm install

# Create a test repo
mkdir -p /tmp/test-repo
echo "# Test" > /tmp/test-repo/ARCHITECTURE.md
echo "# Test" > /tmp/test-repo/README.md

npx forgedocs add /tmp/test-repo
npx forgedocs dev
# Open http://localhost:5173
```

### Running Tests

```bash
npm test                # run tests
npm run test:coverage   # run tests with coverage
npm run lint            # check lint
npm run lint:fix        # auto-fix lint issues
```

## How to Contribute

### Reporting Bugs

Open a [GitHub Issue](https://github.com/laport-n/forgedocs/issues/new?template=bug_report.yml) with steps to reproduce, expected vs actual behavior, and your environment (OS, Node.js version).

### Suggesting Features

Open a [GitHub Issue](https://github.com/laport-n/forgedocs/issues/new?template=feature_request.yml) describing the problem and your proposed solution.

### Submitting Code

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Add tests if applicable
4. Ensure `npm test` and `npm run lint` pass
5. Open a Pull Request

### PR Guidelines

- Keep PRs focused — one feature or fix per PR
- Update documentation if your change affects user-facing behavior
- Follow the existing code style (enforced by Biome)

## Architecture

```
forgedocs/
├── bin/
│   └── forgedocs.mjs         ← CLI entry point (forgedocs init, dev, install, etc.)
├── lib/
│   ├── config.mjs            ← Configuration loading and validation
│   ├── discovery.mjs          ← Repository scanning and detection
│   ├── installer.mjs          ← Template installation into target repos
│   ├── linker.mjs             ← Symlink/junction/copy management
│   └── utils.mjs              ← Shared utilities (expandHome, formatServiceName, debug)
├── scripts/
│   ├── setup.mjs              ← Legacy setup script (kept for npm run compatibility)
│   └── install-commands.mjs   ← Legacy install script
├── templates/
│   ├── claude-commands/       ← Command templates (doc-init, doc-feature, etc.)
│   ├── claude-skills/         ← Skill templates (doc-review)
│   └── github-workflows/     ← CI workflow templates
├── .vitepress/config.ts       ← VitePress config with dynamic sidebar generation
├── test/                      ← Vitest test suite
├── examples/sample-repo/      ← Example repo with full doc structure
├── docsite.config.mjs         ← User configuration
└── content/                   ← Symlinks to local repos (gitignored)
```

### Key Design Decisions

- **Symlinks, not copies**: `content/` contains symlinks to real repos, so docs are always current and hot-reload works
- **Dynamic everything**: Sidebar, nav, and rewrites are generated at startup by scanning `content/`
- **No hardcoded services**: Any repo with `ARCHITECTURE.md` works
- **Modular `lib/`**: Core logic is in testable modules, CLI and scripts are thin wrappers
- **Zero runtime dependencies**: Only VitePress (dev) — everything else uses Node.js built-ins

## Code Style

- ES modules (`import`/`export`)
- Enforced by [Biome](https://biomejs.dev/) — run `npm run lint:fix` to auto-format
- Node.js built-in modules only (no external runtime dependencies)
- Graceful failures with `--verbose` flag for debug output

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
