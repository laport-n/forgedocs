import fs from 'node:fs'
import path from 'node:path'
import { agents } from './agents.mjs'

/**
 * Read the project structure and generate a short (~50 line) navigation-first
 * instruction file for the given agent. These are maps, not manuals — they point
 * to the real documentation (ARCHITECTURE.md, docs/), not duplicate it.
 *
 * The MCP server provides structured data access for agents that support it.
 */
export function generateInstructions(repoPath, agentKey) {
  const agent = agents[agentKey]
  if (!agent) throw new Error(`Unknown agent: ${agentKey}`)

  const ctx = readProjectContext(repoPath)
  const renderer = renderers[agentKey]
  if (!renderer) throw new Error(`No renderer for agent: ${agentKey}`)

  return renderer(ctx, agent)
}

/**
 * Read minimal project context needed to generate instruction file pointers.
 * Does NOT parse doc content — only checks what exists and reads run commands.
 */
function readProjectContext(repoPath) {
  const projectName = detectProjectName(repoPath)

  // Which docs exist?
  const docs = []
  const docChecks = [
    ['ARCHITECTURE.md', 'system map, data flows, and verifiable invariants'],
    ['docs/glossary.md', 'domain vocabulary'],
    ['docs/security.md', 'security constraints and rules'],
    ['docs/service-map.md', 'inter-service communication'],
  ]
  for (const [file, description] of docChecks) {
    if (fs.existsSync(path.join(repoPath, file))) {
      docs.push({ file, description })
    }
  }

  // Top-level directories (for "Where things live")
  const dirs = []
  try {
    const SKIP = new Set([
      'node_modules',
      'vendor',
      'dist',
      'build',
      'coverage',
      '.git',
      '.next',
      '__pycache__',
      'venv',
      '.venv',
      'target',
      'tmp',
      'temp',
      'logs',
      'content',
    ])
    for (const entry of fs.readdirSync(repoPath, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && !SKIP.has(entry.name)) {
        dirs.push(entry.name)
      }
    }
  } catch {
    /* skip */
  }

  // Run commands (from package.json scripts, Makefile, etc.)
  const commands = detectCommands(repoPath)

  // Critical constraints (from existing CLAUDE.md "What to never do" if present)
  const constraints = extractConstraints(repoPath)

  // Doc maintenance rules (from existing CLAUDE.md if present)
  const docRules = extractDocRules(repoPath)

  // MCP availability
  const hasMcp =
    fs.existsSync(path.join(repoPath, '.claude', 'settings.json')) ||
    fs.existsSync(path.join(repoPath, 'node_modules', 'forgedocs'))

  return { projectName, docs, dirs, commands, constraints, docRules, hasMcp, repoPath }
}

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

function detectCommands(dir) {
  const cmds = {}
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'))
    if (pkg.scripts?.test) cmds.test = `npm test`
    if (pkg.scripts?.lint) cmds.lint = `npm run lint`
    if (pkg.scripts?.dev) cmds.dev = `npm run dev`
    if (pkg.scripts?.build) cmds.build = `npm run build`
    if (pkg.scripts?.start) cmds.start = `npm start`
  } catch {
    /* */
  }

  // Fallbacks for non-Node projects
  if (!cmds.test && fs.existsSync(path.join(dir, 'Makefile'))) {
    const makefile = fs.readFileSync(path.join(dir, 'Makefile'), 'utf-8')
    if (/^test:/m.test(makefile)) cmds.test = 'make test'
    if (/^lint:/m.test(makefile)) cmds.lint = 'make lint'
  }
  if (!cmds.test && fs.existsSync(path.join(dir, 'go.mod'))) {
    cmds.test = 'go test ./...'
  }
  if (!cmds.test && fs.existsSync(path.join(dir, 'Cargo.toml'))) {
    cmds.test = 'cargo test'
  }

  return cmds
}

function extractConstraints(repoPath) {
  const claudePath = path.join(repoPath, 'CLAUDE.md')
  if (!fs.existsSync(claudePath)) return []

  const content = fs.readFileSync(claudePath, 'utf-8')
  const constraints = []

  // Extract from "What to never do" section
  const neverMatch = content.match(/## What to never do\n([\s\S]*?)(?=\n##|\n$|$)/)
  if (neverMatch) {
    const lines = neverMatch[1].split('\n')
    for (const line of lines) {
      const trimmed = line.replace(/^[-*]\s*/, '').trim()
      if (trimmed && !trimmed.startsWith('[To be') && !trimmed.startsWith('#')) {
        constraints.push(trimmed)
      }
    }
  }

  return constraints
}

function extractDocRules(repoPath) {
  const claudePath = path.join(repoPath, 'CLAUDE.md')
  if (!fs.existsSync(claudePath)) return []

  const content = fs.readFileSync(claudePath, 'utf-8')
  const rules = []

  const rulesMatch = content.match(/## When to update documentation\n([\s\S]*?)(?=\n##|\n$|$)/)
  if (rulesMatch) {
    const lines = rulesMatch[1].split('\n')
    for (const line of lines) {
      const trimmed = line.replace(/^[-*]\s*/, '').trim()
      if (trimmed && !trimmed.startsWith('[To be') && !trimmed.startsWith('#')) {
        rules.push(trimmed)
      }
    }
  }

  return rules
}

function formatName(slug) {
  return slug
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

// ── Renderers ──
// Each produces a short (~50 line) navigation-first instruction file.

const renderers = {
  claude(ctx) {
    const lines = [`# ${formatName(ctx.projectName)}`]

    lines.push('', '## What to read first')
    if (ctx.docs.length > 0) {
      for (const doc of ctx.docs) lines.push(`- \`${doc.file}\` — ${doc.description}`)
    } else {
      lines.push('- `ARCHITECTURE.md` — system map, data flows, and verifiable invariants')
    }

    lines.push('', '## Where things live')
    for (const dir of ctx.dirs.slice(0, 10)) {
      lines.push(`- \`${dir}/\``)
    }

    lines.push('', '## What to never do')
    if (ctx.constraints.length > 0) {
      for (const c of ctx.constraints) lines.push(`- ${c}`)
    } else {
      lines.push('- [To be filled — e.g. Never commit secrets or credentials]')
    }

    lines.push('', '## How to run')
    if (Object.keys(ctx.commands).length > 0) {
      for (const [name, cmd] of Object.entries(ctx.commands)) {
        lines.push(`- \`${cmd}\` — ${name}`)
      }
    } else {
      lines.push('- [To be filled — e.g. `npm test` — run all tests]')
    }

    if (ctx.docRules.length > 0) {
      lines.push('', '## When to update documentation')
      for (const rule of ctx.docRules) lines.push(`- ${rule}`)
    }

    lines.push('', '## AI tools available (via MCP)')
    lines.push('If the forgedocs MCP server is configured, these tools are available:')
    lines.push('- `search_docs` — full-text search across all documentation')
    lines.push('- `check_drift` — detect documentation drift vs filesystem')
    lines.push('- `get_health_score` — doc health score with detailed breakdown')
    lines.push('- `suggest_updates` — get prioritized suggestions for improving docs')
    lines.push('')

    return lines.join('\n')
  },

  cursor(ctx) {
    const lines = [
      '---',
      'description: Project documentation rules and codebase context',
      'alwaysApply: true',
      '---',
      `# ${formatName(ctx.projectName)}`,
    ]

    lines.push('', '## Read first')
    if (ctx.docs.length > 0) {
      for (const doc of ctx.docs) lines.push(`- @${doc.file} — ${doc.description}`)
    }

    lines.push('', '## Where things live')
    for (const dir of ctx.dirs.slice(0, 10)) {
      lines.push(`- \`${dir}/\``)
    }

    lines.push('', '## Rules (never break these)')
    if (ctx.constraints.length > 0) {
      for (const c of ctx.constraints) lines.push(`- ${c}`)
    } else {
      lines.push('- See docs/security.md for security constraints')
    }

    lines.push('', '## Commands')
    for (const [name, cmd] of Object.entries(ctx.commands)) {
      lines.push(`- ${name}: \`${cmd}\``)
    }

    if (ctx.docRules.length > 0) {
      lines.push('', '## Documentation maintenance')
      for (const rule of ctx.docRules) lines.push(`- ${rule}`)
    }

    if (ctx.hasMcp) {
      lines.push('', '## MCP tools available')
      lines.push(
        'The `forgedocs` MCP server provides: search_docs, check_drift, get_health_score, suggest_updates, get_codemap, query_docs',
      )
    }

    lines.push('')
    return lines.join('\n')
  },

  windsurf(ctx) {
    const lines = [`# ${formatName(ctx.projectName)}`]

    lines.push('', '## Read first')
    for (const doc of ctx.docs) lines.push(`- ${doc.file} — ${doc.description}`)

    lines.push('', '## Where things live')
    for (const dir of ctx.dirs.slice(0, 10)) lines.push(`- ${dir}/`)

    lines.push('', '## Rules')
    if (ctx.constraints.length > 0) {
      for (const c of ctx.constraints) lines.push(`- ${c}`)
    } else {
      lines.push('- See docs/security.md for security constraints')
    }

    lines.push('', '## Commands')
    for (const [name, cmd] of Object.entries(ctx.commands)) {
      lines.push(`- ${name}: \`${cmd}\``)
    }

    if (ctx.docRules.length > 0) {
      lines.push('', '## Documentation maintenance')
      for (const rule of ctx.docRules) lines.push(`- ${rule}`)
    }

    if (ctx.hasMcp) {
      lines.push('', '## MCP tools available')
      lines.push('The forgedocs MCP server provides: search_docs, check_drift, get_health_score, suggest_updates')
    }

    lines.push('')
    return lines.join('\n')
  },

  copilot(ctx) {
    // Copilot has limited context — keep it very concise
    const lines = [`# ${formatName(ctx.projectName)}`]

    lines.push('', '## Architecture')
    lines.push('Read ARCHITECTURE.md for the system map, codemap, data flow, and verifiable invariants.')
    if (ctx.docs.some((d) => d.file === 'docs/glossary.md')) lines.push('Read docs/glossary.md for domain vocabulary.')
    if (ctx.docs.some((d) => d.file === 'docs/security.md')) lines.push('Read docs/security.md for security rules.')

    lines.push('', '## Key directories')
    lines.push(
      ctx.dirs
        .slice(0, 8)
        .map((d) => `\`${d}/\``)
        .join(' · '),
    )

    lines.push('', '## Rules')
    if (ctx.constraints.length > 0) {
      for (const c of ctx.constraints.slice(0, 5)) lines.push(`- ${c}`)
    }

    lines.push('', '## Commands')
    for (const [name, cmd] of Object.entries(ctx.commands)) {
      lines.push(`- ${name}: \`${cmd}\``)
    }

    lines.push('')
    return lines.join('\n')
  },

  cline(ctx) {
    const lines = [`# ${formatName(ctx.projectName)}`]

    lines.push('', '## Read first')
    for (const doc of ctx.docs) lines.push(`- ${doc.file} — ${doc.description}`)

    lines.push('', '## Where things live')
    for (const dir of ctx.dirs.slice(0, 10)) lines.push(`- ${dir}/`)

    lines.push('', '## Rules')
    if (ctx.constraints.length > 0) {
      for (const c of ctx.constraints) lines.push(`- ${c}`)
    } else {
      lines.push('- See docs/security.md for security constraints')
    }

    lines.push('', '## Commands')
    for (const [name, cmd] of Object.entries(ctx.commands)) {
      lines.push(`- ${name}: \`${cmd}\``)
    }

    if (ctx.docRules.length > 0) {
      lines.push('', '## Documentation maintenance')
      for (const rule of ctx.docRules) lines.push(`- ${rule}`)
    }

    if (ctx.hasMcp) {
      lines.push('', '## MCP tools available')
      lines.push(
        'The forgedocs MCP server provides: search_docs, check_drift, get_health_score, suggest_updates, get_codemap, query_docs',
      )
    }

    lines.push('')
    return lines.join('\n')
  },
}
