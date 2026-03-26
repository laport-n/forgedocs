import fs from 'node:fs'
import path from 'node:path'
import { installTemplates } from './installer.mjs'
import { debug } from './utils.mjs'

/**
 * Stack presets — each defines extra sections for ARCHITECTURE.md and docs/.
 * Users can pass --preset <name> to get stack-specific scaffolding.
 */
const PRESETS = {
  nextjs: {
    name: 'Next.js',
    detect: (dir) =>
      hasFile(dir, 'next.config.js') ||
      hasFile(dir, 'next.config.mjs') ||
      hasFile(dir, 'next.config.ts') ||
      hasDep(dir, 'next'),
    codemapEntries: [
      { component: 'App Router', path: 'app/', purpose: 'Page routes, layouts, and API routes' },
      { component: 'Components', path: 'components/', purpose: 'Shared React components' },
      { component: 'Middleware', path: 'middleware.ts', purpose: 'Request middleware (auth, redirects)' },
      { component: 'Public Assets', path: 'public/', purpose: 'Static files served at root' },
    ],
    dataFlow: `Browser → Middleware → App Router → Server Components → Data Fetching → Response
                                    → API Routes → External Services → JSON Response`,
    extraDocs: {
      'docs/routing.md': `# Routing\n\n## App Router Structure\n\n[To be documented — describe your route hierarchy]\n\n## Middleware\n\n[To be documented — describe middleware logic]\n`,
    },
  },
  react: {
    name: 'React',
    detect: (dir) => hasDep(dir, 'react') && !hasDep(dir, 'next'),
    codemapEntries: [
      { component: 'Components', path: 'src/components/', purpose: 'React UI components' },
      { component: 'Pages/Views', path: 'src/pages/', purpose: 'Top-level page components' },
      { component: 'Hooks', path: 'src/hooks/', purpose: 'Custom React hooks' },
      { component: 'State', path: 'src/store/', purpose: 'State management (Redux/Zustand/Context)' },
    ],
    dataFlow: `User Interaction → Component → Hook/Action → State Update → Re-render
                                            → API Call → Response → State Update`,
  },
  fastapi: {
    name: 'FastAPI (Python)',
    detect: (dir) => hasPyDep(dir, 'fastapi'),
    codemapEntries: [
      { component: 'App', path: 'app/main.py', purpose: 'FastAPI application entry point' },
      { component: 'Routes', path: 'app/routes/', purpose: 'API endpoint definitions' },
      { component: 'Models', path: 'app/models/', purpose: 'Pydantic models and DB schemas' },
      { component: 'Services', path: 'app/services/', purpose: 'Business logic layer' },
    ],
    dataFlow: `HTTP Request → Middleware → Dependency Injection → Route Handler → Service → DB
                                                                              → Pydantic Response`,
    extraDocs: {
      'docs/api-endpoints.md': `# API Endpoints\n\n[To be documented — list your route groups and key endpoints]\n`,
    },
  },
  django: {
    name: 'Django',
    detect: (dir) => hasPyDep(dir, 'django') || hasFile(dir, 'manage.py'),
    codemapEntries: [
      { component: 'Settings', path: 'settings.py', purpose: 'Django configuration' },
      { component: 'URLs', path: 'urls.py', purpose: 'URL routing' },
      { component: 'Views', path: 'views.py', purpose: 'Request handlers' },
      { component: 'Models', path: 'models.py', purpose: 'Database models (ORM)' },
    ],
    dataFlow: `HTTP Request → URL Router → Middleware → View → Model/ORM → Database
                                                             → Template/Serializer → Response`,
  },
  express: {
    name: 'Express.js',
    detect: (dir) => hasDep(dir, 'express'),
    codemapEntries: [
      { component: 'Server', path: 'src/server.js', purpose: 'Express app setup and middleware' },
      { component: 'Routes', path: 'src/routes/', purpose: 'API route definitions' },
      { component: 'Controllers', path: 'src/controllers/', purpose: 'Request handlers' },
      { component: 'Models', path: 'src/models/', purpose: 'Database models' },
    ],
    dataFlow: `HTTP Request → Express Middleware → Router → Controller → Model → Database
                                                                       → JSON Response`,
  },
  nestjs: {
    name: 'NestJS',
    detect: (dir) => hasDep(dir, '@nestjs/core'),
    codemapEntries: [
      { component: 'App Module', path: 'src/app.module.ts', purpose: 'Root module' },
      { component: 'Controllers', path: 'src/**/*.controller.ts', purpose: 'HTTP request handlers' },
      { component: 'Services', path: 'src/**/*.service.ts', purpose: 'Business logic providers' },
      { component: 'Guards', path: 'src/guards/', purpose: 'Authentication/authorization guards' },
    ],
    dataFlow: `HTTP Request → Guard → Interceptor → Pipe → Controller → Service → Repository → DB
                            → Interceptor → Response`,
  },
  rails: {
    name: 'Ruby on Rails',
    detect: (dir) => hasFile(dir, 'Gemfile') && hasFile(dir, 'config/routes.rb'),
    codemapEntries: [
      { component: 'Routes', path: 'config/routes.rb', purpose: 'URL routing' },
      { component: 'Controllers', path: 'app/controllers/', purpose: 'Request handlers' },
      { component: 'Models', path: 'app/models/', purpose: 'ActiveRecord models' },
      { component: 'Views', path: 'app/views/', purpose: 'ERB/Haml templates' },
      { component: 'Jobs', path: 'app/jobs/', purpose: 'Background jobs (Sidekiq/ActiveJob)' },
    ],
    dataFlow: `HTTP Request → Rack Middleware → Router → Controller → Model → Database
                                                                    → View/Serializer → Response`,
  },
  go: {
    name: 'Go',
    detect: (dir) => hasFile(dir, 'go.mod'),
    codemapEntries: [
      { component: 'Main', path: 'cmd/', purpose: 'Application entry points' },
      { component: 'Handlers', path: 'internal/handler/', purpose: 'HTTP/gRPC handlers' },
      { component: 'Services', path: 'internal/service/', purpose: 'Business logic' },
      { component: 'Repository', path: 'internal/repository/', purpose: 'Data access layer' },
    ],
    dataFlow: `Request → Router → Middleware → Handler → Service → Repository → Database
                                                                  → Response`,
  },
  rust: {
    name: 'Rust',
    detect: (dir) => hasFile(dir, 'Cargo.toml'),
    codemapEntries: [
      { component: 'Main', path: 'src/main.rs', purpose: 'Application entry point' },
      { component: 'Lib', path: 'src/lib.rs', purpose: 'Library root' },
      { component: 'Handlers', path: 'src/handlers/', purpose: 'Request handlers (Axum/Actix)' },
      { component: 'Models', path: 'src/models/', purpose: 'Data structures and types' },
    ],
    dataFlow: `Request → Router → Middleware/Extractor → Handler → Service → Database
                                                                  → Response`,
  },
}

function hasFile(dir, name) {
  return fs.existsSync(path.join(dir, name))
}

function hasDep(dir, dep) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'))
    return !!(pkg.dependencies?.[dep] || pkg.devDependencies?.[dep])
  } catch {
    return false
  }
}

function hasPyDep(dir, dep) {
  for (const file of ['requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py', 'setup.cfg']) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8')
      if (content.toLowerCase().includes(dep.toLowerCase())) return true
    } catch {
      /* skip */
    }
  }
  return false
}

/** Detect the tech stack of a repository */
export function detectStack(dir) {
  const detected = []
  for (const [key, preset] of Object.entries(PRESETS)) {
    if (preset.detect(dir)) {
      detected.push(key)
      debug(`Detected stack: ${preset.name}`)
    }
  }
  return detected
}

/** Discover the directory structure of a repo (top 2 levels, skip noise) */
export function discoverStructure(dir) {
  const SKIP = new Set([
    'node_modules',
    'vendor',
    'venv',
    '.venv',
    'target',
    'dist',
    'build',
    'coverage',
    '.git',
    '.next',
    '__pycache__',
    '.pytest_cache',
    '.mypy_cache',
    'tmp',
    'temp',
    'logs',
    '.turbo',
    '.cache',
    '.idea',
    '.vscode',
  ])

  const structure = []

  function scan(current, depth, prefix) {
    if (depth > 2) return
    try {
      const entries = fs
        .readdirSync(current, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP.has(e.name))
        .sort((a, b) => a.name.localeCompare(b.name))

      for (const entry of entries) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name
        structure.push({ name: entry.name, path: `${rel}/`, depth })
        scan(path.join(current, entry.name), depth + 1, rel)
      }
    } catch {
      /* skip unreadable */
    }
  }

  scan(dir, 0, '')
  return structure
}

/** Detect the project name from package.json, Cargo.toml, go.mod, or directory name */
function detectProjectName(dir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'))
    if (pkg.name) return pkg.name.replace(/^@[^/]+\//, '')
  } catch {
    /* */
  }
  try {
    const cargo = fs.readFileSync(path.join(dir, 'Cargo.toml'), 'utf-8')
    const match = cargo.match(/name\s*=\s*"([^"]+)"/)
    if (match) return match[1]
  } catch {
    /* */
  }
  try {
    const gomod = fs.readFileSync(path.join(dir, 'go.mod'), 'utf-8')
    const match = gomod.match(/module\s+(\S+)/)
    if (match) return match[1].split('/').pop()
  } catch {
    /* */
  }
  return path.basename(dir)
}

/** Generate scaffold ARCHITECTURE.md from filesystem analysis */
function generateArchitecture(dir, projectName, preset) {
  const structure = discoverStructure(dir)
  const topDirs = structure.filter((s) => s.depth === 0)

  // Build codemap from preset or from discovered structure
  let codemapRows
  if (preset && PRESETS[preset]) {
    const presetEntries = PRESETS[preset].codemapEntries
    // Only include entries whose paths actually exist
    codemapRows = presetEntries
      .filter((e) => {
        const checkPath = e.path.replace(/\*\*/g, '').replace(/\*/g, '')
        return fs.existsSync(path.join(dir, checkPath)) || e.path.includes('*')
      })
      .map((e) => `| ${e.component} | \`${e.path}\` | ${e.purpose} |`)

    // Add any top-level dirs not covered by the preset
    const presetPaths = new Set(presetEntries.map((e) => e.path.split('/')[0]))
    for (const d of topDirs) {
      if (!presetPaths.has(d.name) && !['docs', 'test', 'tests', 'spec', '__tests__'].includes(d.name)) {
        codemapRows.push(`| ${capitalize(d.name)} | \`${d.path}\` | [To be documented] |`)
      }
    }
  } else {
    codemapRows = topDirs
      .filter((d) => !['docs', 'test', 'tests', 'spec', '__tests__'].includes(d.name))
      .map((d) => `| ${capitalize(d.name)} | \`${d.path}\` | [To be documented] |`)
  }

  if (codemapRows.length === 0) {
    codemapRows.push('| Main | `.` | [To be documented] |')
  }

  // Build data flow
  let dataFlow
  if (preset && PRESETS[preset]?.dataFlow) {
    dataFlow = PRESETS[preset].dataFlow
  } else {
    dataFlow = '[To be documented — describe the main request/data flow through your system]'
  }

  const presetLabel = preset ? ` (${PRESETS[preset].name})` : ''

  return `# ${formatName(projectName)} — Architecture${presetLabel}

## System Overview

[To be documented — describe what this service does and its primary responsibilities]

## Codemap

| Component | Path | Purpose |
|-----------|------|---------|
${codemapRows.join('\n')}

## Data Flow

\`\`\`
${dataFlow}
\`\`\`

## Verifiable Invariants

| Rule | Check |
|------|-------|
| [To be documented] | \`echo "Add verification commands"\` |

## Cross-Cutting Concerns

- [To be documented — list concerns like logging, error handling, auth, etc.]
`
}

/** Generate scaffold README.md */
function generateReadme(projectName) {
  return `# ${formatName(projectName)}

## Overview

[To be documented — what does this project do?]

## Getting Started

\`\`\`bash
# [To be documented — setup commands]
\`\`\`

## Development

\`\`\`bash
# [To be documented — dev commands]
\`\`\`

## Deployment

[To be documented — how to deploy]
`
}

/** Generate scaffold CLAUDE.md */
function generateClaude(projectName) {
  return `# ${formatName(projectName)}

## What to read first
- \`ARCHITECTURE.md\` — system map, data flows, and verifiable invariants
- \`docs/glossary.md\` — domain vocabulary
- \`docs/security.md\` — security considerations

## Where things live
[To be documented — key directories and files]

## What to never do
[To be documented — anti-patterns and forbidden practices]

## How to run
[To be documented — commands for test, lint, dev, build]
`
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatName(slug) {
  return slug.split(/[-_]/).map(capitalize).join(' ')
}

/**
 * Run quickstart on a target directory:
 * - Detect stack
 * - Generate ARCHITECTURE.md, README.md, CLAUDE.md, docs/ scaffolds
 * - Install Claude commands
 * - Returns summary of what was created
 */
export function quickstart(targetDir, templatesDir, { preset = null, force = false } = {}) {
  const created = []
  const skipped = []

  const projectName = detectProjectName(targetDir)

  // Auto-detect preset if not specified
  if (!preset) {
    const detected = detectStack(targetDir)
    if (detected.length > 0) {
      preset = detected[0]
      debug(`Auto-detected preset: ${preset}`)
    }
  }

  // Validate preset
  if (preset && !PRESETS[preset]) {
    throw new Error(`Unknown preset: ${preset}. Available: ${Object.keys(PRESETS).join(', ')}`)
  }

  // Generate ARCHITECTURE.md
  const archPath = path.join(targetDir, 'ARCHITECTURE.md')
  if (!fs.existsSync(archPath) || force) {
    fs.writeFileSync(archPath, generateArchitecture(targetDir, projectName, preset))
    created.push('ARCHITECTURE.md')
  } else {
    skipped.push('ARCHITECTURE.md (already exists)')
  }

  // Generate README.md (only if missing)
  const readmePath = path.join(targetDir, 'README.md')
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, generateReadme(projectName))
    created.push('README.md')
  } else {
    skipped.push('README.md (already exists)')
  }

  // Generate CLAUDE.md
  const claudePath = path.join(targetDir, 'CLAUDE.md')
  if (!fs.existsSync(claudePath) || force) {
    fs.writeFileSync(claudePath, generateClaude(projectName))
    created.push('CLAUDE.md')
  } else {
    skipped.push('CLAUDE.md (already exists)')
  }

  // Create docs/ structure
  const docsFiles = {
    'docs/glossary.md': `# Glossary\n\n| Term | Definition |\n|------|------------|\n| [Term] | [Definition] |\n`,
    'docs/security.md': `# Security\n\n## Rules\n\n1. [To be documented — security rules for this project]\n`,
    'docs/service-map.md': `# Service Map\n\n## Dependencies\n\n| Service | Purpose | Protocol |\n|---------|---------|----------|\n| [Service] | [Purpose] | [Protocol] |\n\n*Last verified: ${new Date().toISOString().split('T')[0]}*\n`,
  }

  // Add preset-specific docs
  if (preset && PRESETS[preset]?.extraDocs) {
    Object.assign(docsFiles, PRESETS[preset].extraDocs)
  }

  for (const [relPath, content] of Object.entries(docsFiles)) {
    const fullPath = path.join(targetDir, relPath)
    if (!fs.existsSync(fullPath) || force) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      fs.writeFileSync(fullPath, content)
      created.push(relPath)
    } else {
      skipped.push(`${relPath} (already exists)`)
    }
  }

  // Create docs/features/ and docs/adr/ directories
  for (const subdir of ['docs/features', 'docs/adr']) {
    const fullPath = path.join(targetDir, subdir)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
      created.push(`${subdir}/`)
    }
  }

  // Install Claude Code commands
  let installResult = { installed: [], updated: [], skipped: [] }
  if (templatesDir && fs.existsSync(templatesDir)) {
    installResult = installTemplates(templatesDir, targetDir, { force })
  }

  return {
    projectName,
    preset: preset ? PRESETS[preset].name : null,
    created,
    skipped,
    commandsInstalled: installResult.installed,
    commandsSkipped: installResult.skipped,
  }
}

/** List available presets */
export function listPresets() {
  return Object.entries(PRESETS).map(([key, p]) => ({ key, name: p.name }))
}
