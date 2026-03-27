import fs from 'node:fs'
import path from 'node:path'
import { loadReposConfig } from './config.mjs'
import { detectDrift, parseCodemap, parseInvariants } from './diff.mjs'
import { calculateHealth } from './health.mjs'
import { lintDocs } from './lint.mjs'

/**
 * Lightweight MCP server for Forgedocs.
 * Implements JSON-RPC 2.0 over stdio (the MCP protocol) without external dependencies.
 *
 * Tools:
 *   - list_services: list all tracked repos with metadata
 *   - get_service_docs: read a specific doc from a service
 *   - search_docs: full-text search across all linked repos
 *   - check_freshness: check doc freshness and staleness
 *   - get_health_score: get structured doc health score (0-100) for a service
 *   - get_codemap: get ARCHITECTURE.md codemap as structured JSON
 *   - check_drift: detect documentation drift (new/removed/stale entries)
 *   - suggest_updates: get AI-actionable suggestions for improving docs
 */

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = { name: 'forgedocs', version: '0.7.3' }

const TOOLS = [
  {
    name: 'list_services',
    description:
      'List all tracked repos with their documentation status (path, docs present, feature count, ADR count)',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_service_docs',
    description: 'Read a specific documentation file from a tracked service. Returns the file content as markdown.',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Service name (as shown in list_services)' },
        doc: {
          type: 'string',
          description:
            'Doc to read: "readme", "architecture", "claude", "glossary", "security", "service-map", or a path like "features/my-feature" or "adr/001-decision"',
          default: 'architecture',
        },
      },
      required: ['service'],
    },
  },
  {
    name: 'search_docs',
    description:
      'Full-text search across all documentation in all tracked services. Returns matching lines with context.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text to search for (case-insensitive)' },
        service: { type: 'string', description: 'Optional: limit search to a specific service' },
      },
      required: ['query'],
    },
  },
  {
    name: 'check_freshness',
    description:
      'Check documentation freshness for one or all services. Reports missing docs, stale service-map, and doc coverage.',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Optional: check a specific service (default: all)' },
      },
      required: [],
    },
  },
  {
    name: 'get_health_score',
    description:
      'Get the documentation health score (0-100) for a service, with detailed breakdown by category (Structure, Quality, Depth). Returns structured JSON with individual check results. Use this to understand what documentation is missing or incomplete.',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Service name to check' },
      },
      required: ['service'],
    },
  },
  {
    name: 'get_codemap',
    description:
      "Extract the codemap from a service's ARCHITECTURE.md as structured JSON. Returns an array of {component, path, purpose} entries. Use this to understand the service's module structure without parsing markdown.",
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Service name' },
      },
      required: ['service'],
    },
  },
  {
    name: 'check_drift',
    description:
      'Detect documentation drift for a service. Compares the ARCHITECTURE.md codemap against the actual filesystem. Returns new directories not in codemap, removed paths still referenced, undocumented entries, and invariants to verify.',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Service name' },
      },
      required: ['service'],
    },
  },
  {
    name: 'suggest_updates',
    description:
      'Get actionable suggestions for improving documentation for a service. Combines health score, drift detection, and freshness checks into prioritized recommendations that an AI agent can act on immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Service name' },
      },
      required: ['service'],
    },
  },
  {
    name: 'query_docs',
    description:
      'Query documentation with targeted filters. Instead of reading entire files, extract specific sections: "invariants", "codemap", "glossary", "security-rules", "service-dependencies", "adr-rules", or "feature-invariants". Returns structured JSON — much more token-efficient than reading raw markdown.',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Service name' },
        type: {
          type: 'string',
          description:
            'What to query: "invariants", "codemap", "glossary", "security-rules", "service-dependencies", "adr-rules", "feature-invariants", "all-rules"',
          enum: [
            'invariants',
            'codemap',
            'glossary',
            'security-rules',
            'service-dependencies',
            'adr-rules',
            'feature-invariants',
            'all-rules',
          ],
        },
      },
      required: ['service', 'type'],
    },
  },
  {
    name: 'lint_docs',
    description:
      'Lint documentation for a service. Checks for broken file references, stale placeholders, missing invariants, ARCHITECTURE.md length, CLAUDE.md structure, ADR format, and more. Use this to verify your documentation changes are correct.',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Service name' },
      },
      required: ['service'],
    },
  },
]

function getRepos(cwd) {
  const configPath = path.join(cwd, '.repos.json')
  return loadReposConfig(configPath) || {}
}

function resolveDocPath(repoPath, doc) {
  const mapping = {
    readme: 'README.md',
    architecture: 'ARCHITECTURE.md',
    claude: 'CLAUDE.md',
    glossary: 'docs/glossary.md',
    security: 'docs/security.md',
    'service-map': 'docs/service-map.md',
  }

  const relativePath = mapping[doc] || `docs/${doc}.md`
  return path.join(repoPath, relativePath)
}

function handleListServices(cwd) {
  const repos = getRepos(cwd)
  const services = {}

  for (const [name, repoPath] of Object.entries(repos)) {
    const exists = fs.existsSync(repoPath)
    const hasArch = exists && fs.existsSync(path.join(repoPath, 'ARCHITECTURE.md'))
    const hasReadme = exists && fs.existsSync(path.join(repoPath, 'README.md'))
    const hasClaude = exists && fs.existsSync(path.join(repoPath, 'CLAUDE.md'))
    const hasDocs = exists && fs.existsSync(path.join(repoPath, 'docs'))

    let featureCount = 0
    let adrCount = 0
    const features = []
    const adrs = []
    if (exists) {
      const featDir = path.join(repoPath, 'docs', 'features')
      if (fs.existsSync(featDir)) {
        const featFiles = fs.readdirSync(featDir).filter((f) => f.endsWith('.md'))
        featureCount = featFiles.length
        features.push(...featFiles.map((f) => f.replace('.md', '')))
      }
      const adrDir = path.join(repoPath, 'docs', 'adr')
      if (fs.existsSync(adrDir)) {
        const adrFiles = fs.readdirSync(adrDir).filter((f) => f.endsWith('.md') && f !== 'README.md')
        adrCount = adrFiles.length
        adrs.push(...adrFiles.map((f) => f.replace('.md', '')))
      }
    }

    services[name] = {
      path: repoPath,
      exists,
      hasArchitecture: hasArch,
      hasReadme,
      hasClaude,
      hasDocs,
      featureCount,
      features,
      adrCount,
      adrs,
    }
  }

  return JSON.stringify(services, null, 2)
}

function handleGetServiceDocs(cwd, params) {
  const repos = getRepos(cwd)
  const { service, doc = 'architecture' } = params

  if (!repos[service]) {
    return `Error: Service "${service}" not found. Available: ${Object.keys(repos).join(', ')}`
  }

  const filePath = resolveDocPath(repos[service], doc)

  if (!fs.existsSync(filePath)) {
    // List available docs for this service
    const repoPath = repos[service]
    const available = []
    if (fs.existsSync(path.join(repoPath, 'README.md'))) available.push('readme')
    if (fs.existsSync(path.join(repoPath, 'ARCHITECTURE.md'))) available.push('architecture')
    if (fs.existsSync(path.join(repoPath, 'CLAUDE.md'))) available.push('claude')
    const docsDir = path.join(repoPath, 'docs')
    if (fs.existsSync(docsDir)) {
      for (const f of fs.readdirSync(docsDir)) {
        if (f.endsWith('.md')) available.push(f.replace('.md', ''))
      }
      const featDir = path.join(docsDir, 'features')
      if (fs.existsSync(featDir)) {
        for (const f of fs.readdirSync(featDir).filter((f) => f.endsWith('.md'))) {
          available.push(`features/${f.replace('.md', '')}`)
        }
      }
      const adrDir = path.join(docsDir, 'adr')
      if (fs.existsSync(adrDir)) {
        for (const f of fs.readdirSync(adrDir).filter((f) => f.endsWith('.md') && f !== 'README.md')) {
          available.push(`adr/${f.replace('.md', '')}`)
        }
      }
    }
    return `Error: "${doc}" not found for service "${service}". Available docs: ${available.join(', ')}`
  }

  return fs.readFileSync(filePath, 'utf-8')
}

function handleSearchDocs(cwd, params) {
  const repos = getRepos(cwd)
  const { query, service } = params
  const searchIn = service ? { [service]: repos[service] } : repos
  const queryLower = query.toLowerCase()
  const results = []

  for (const [name, repoPath] of Object.entries(searchIn)) {
    if (!repoPath || !fs.existsSync(repoPath)) continue

    const mdFiles = collectMarkdownFiles(repoPath)
    for (const filePath of mdFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(queryLower)) {
            const relativePath = path.relative(repoPath, filePath)
            const context = lines.slice(Math.max(0, i - 1), i + 2).join('\n')
            results.push({ service: name, file: relativePath, line: i + 1, context })
            if (results.length >= 50) break
          }
        }
        if (results.length >= 50) break
      } catch {
        /* skip unreadable files */
      }
    }
    if (results.length >= 50) break
  }

  if (results.length === 0) {
    return `No results found for "${query}"${service ? ` in service "${service}"` : ''}.`
  }

  return results.map((r) => `**${r.service}/${r.file}** (line ${r.line}):\n\`\`\`\n${r.context}\n\`\`\``).join('\n\n')
}

function handleCheckFreshness(cwd, params) {
  const repos = getRepos(cwd)
  const { service } = params
  const checkIn = service ? { [service]: repos[service] } : repos
  const report = []

  for (const [name, repoPath] of Object.entries(checkIn)) {
    if (!repoPath || !fs.existsSync(repoPath)) {
      report.push(`${name}: MISSING — path does not exist`)
      continue
    }

    const issues = []
    if (!fs.existsSync(path.join(repoPath, 'README.md'))) {
      issues.push('No README.md (will show 404 in doc site)')
    }
    if (!fs.existsSync(path.join(repoPath, 'ARCHITECTURE.md'))) {
      issues.push("No ARCHITECTURE.md (repo won't appear in doc site)")
    }
    if (!fs.existsSync(path.join(repoPath, 'CLAUDE.md'))) {
      issues.push('No CLAUDE.md (AI agents lack context)')
    }
    if (!fs.existsSync(path.join(repoPath, 'docs'))) {
      issues.push('No docs/ directory')
    }

    // Check service-map staleness
    const serviceMapPath = path.join(repoPath, 'docs', 'service-map.md')
    if (fs.existsSync(serviceMapPath)) {
      const content = fs.readFileSync(serviceMapPath, 'utf-8')
      const match = content.match(/Last verified:\s*(\d{4}-\d{2}-\d{2})/)
      if (match) {
        const lastDate = new Date(match[1])
        const daysOld = Math.floor((Date.now() - lastDate.getTime()) / 86400000)
        if (daysOld > 90) {
          issues.push(`service-map.md last verified ${daysOld} days ago (max 90)`)
        }
      }
    }

    if (issues.length === 0) {
      report.push(`${name}: OK`)
    } else {
      report.push(`${name}:\n${issues.map((i) => `  - ${i}`).join('\n')}`)
    }
  }

  return report.join('\n\n')
}

function handleHealthScore(cwd, params) {
  const repos = getRepos(cwd)
  const { service } = params

  if (!repos[service]) {
    return `Error: Service "${service}" not found. Available: ${Object.keys(repos).join(', ')}`
  }
  if (!fs.existsSync(repos[service])) {
    return `Error: Service "${service}" path does not exist: ${repos[service]}`
  }

  const health = calculateHealth(repos[service])
  return JSON.stringify(health, null, 2)
}

function handleGetCodemap(cwd, params) {
  const repos = getRepos(cwd)
  const { service } = params

  if (!repos[service]) {
    return `Error: Service "${service}" not found. Available: ${Object.keys(repos).join(', ')}`
  }

  const archPath = path.join(repos[service], 'ARCHITECTURE.md')
  if (!fs.existsSync(archPath)) {
    return `Error: No ARCHITECTURE.md found for "${service}". Run \`forgedocs quickstart\` or \`/doc-init\` to create one.`
  }

  const content = fs.readFileSync(archPath, 'utf-8')
  const codemap = parseCodemap(content)
  const invariants = parseInvariants(content)

  return JSON.stringify({ service, codemap, invariants }, null, 2)
}

function handleCheckDrift(cwd, params) {
  const repos = getRepos(cwd)
  const { service } = params

  if (!repos[service]) {
    return `Error: Service "${service}" not found. Available: ${Object.keys(repos).join(', ')}`
  }
  if (!fs.existsSync(repos[service])) {
    return `Error: Service "${service}" path does not exist: ${repos[service]}`
  }

  const drift = detectDrift(repos[service])
  return JSON.stringify(
    {
      service,
      added: drift.added,
      removed: drift.removed,
      stale: drift.stale,
      invariants: drift.invariantResults,
      summary: {
        newDirectories: drift.added.length,
        removedPaths: drift.removed.length,
        undocumentedEntries: drift.stale.length,
        invariantsToVerify: drift.invariantResults.length,
        hasDrift: drift.added.length > 0 || drift.removed.length > 0,
      },
    },
    null,
    2,
  )
}

function handleSuggestUpdates(cwd, params) {
  const repos = getRepos(cwd)
  const { service } = params

  if (!repos[service]) {
    return `Error: Service "${service}" not found. Available: ${Object.keys(repos).join(', ')}`
  }

  const repoPath = repos[service]
  if (!fs.existsSync(repoPath)) {
    return `Error: Service "${service}" path does not exist: ${repoPath}`
  }

  const suggestions = []
  const health = calculateHealth(repoPath)

  // Generate actionable suggestions from failed health checks
  for (const check of health.checks) {
    if (check.status === 'pass') continue

    switch (check.id) {
      case 'architecture':
        suggestions.push({
          priority: 'critical',
          action: 'Create ARCHITECTURE.md',
          command: '/doc-init',
          detail: 'Run /doc-init in Claude Code or `forgedocs quickstart` to generate from codebase analysis.',
        })
        break
      case 'readme':
        suggestions.push({
          priority: 'high',
          action: 'Create README.md',
          command: '/doc-init',
          detail: 'The /doc-init command will generate a README.md if missing.',
        })
        break
      case 'claude':
        suggestions.push({
          priority: 'high',
          action: 'Create CLAUDE.md',
          command: '/doc-init',
          detail: 'CLAUDE.md helps AI agents navigate the codebase. /doc-init generates it.',
        })
        break
      case 'docs-dir':
        suggestions.push({
          priority: 'medium',
          action: 'Create docs/ directory structure',
          command: 'forgedocs quickstart',
          detail:
            'Run `forgedocs quickstart` to scaffold the docs/ directory with glossary, security, and service-map.',
        })
        break
      case 'service-map':
        suggestions.push({
          priority: 'medium',
          action: 'Create docs/service-map.md',
          command: '/doc-init',
          detail: 'Document inter-service dependencies and communication patterns.',
        })
        break
      case 'invariants':
        suggestions.push({
          priority: 'high',
          action: 'Add verifiable invariants to ARCHITECTURE.md',
          command: '/doc-review',
          detail:
            'Add a "Verifiable Invariants" table with rules and shell commands that verify them. Example: `| All tests pass | `npm test` exit 0 |`',
        })
        break
      case 'codemap':
        suggestions.push({
          priority: 'high',
          action: 'Add codemap to ARCHITECTURE.md',
          command: '/doc-init',
          detail: 'The codemap table maps modules to file paths. /doc-init generates it from codebase analysis.',
        })
        break
      case 'security':
        suggestions.push({
          priority: 'medium',
          action: 'Create docs/security.md',
          command: '/doc-init',
          detail: 'Document authentication, authorization, and data protection rules.',
        })
        break
      case 'glossary':
        suggestions.push({
          priority: 'low',
          action: 'Add terms to docs/glossary.md',
          command: '/doc-init',
          detail: 'Define domain-specific vocabulary that new developers and AI agents need to understand.',
        })
        break
      case 'features':
        suggestions.push({
          priority: 'medium',
          action: 'Document at least one complex feature',
          command: '/doc-feature',
          detail:
            'Use /doc-feature in Claude Code to generate a feature doc with invariants, preconditions, and failure modes.',
        })
        break
      case 'adrs':
        suggestions.push({
          priority: 'low',
          action: 'Create at least one Architecture Decision Record',
          command: '/doc-adr',
          detail: 'Use /doc-adr in Claude Code to document a significant architectural decision.',
        })
        break
      case 'service-map-fresh':
        suggestions.push({
          priority: 'medium',
          action: 'Update service-map.md "Last verified" date',
          command: '/doc-sync',
          detail: 'Review and update the service map, then set the "Last verified" date to today.',
        })
        break
    }
  }

  // Add drift-based suggestions
  try {
    const drift = detectDrift(repoPath)
    for (const added of drift.added) {
      suggestions.push({
        priority: 'medium',
        action: `Add ${added.path} to ARCHITECTURE.md codemap`,
        command: '/doc-sync',
        detail: `New directory "${added.path}" exists but is not in the codemap. Use /doc-sync to update.`,
      })
    }
    for (const removed of drift.removed) {
      suggestions.push({
        priority: 'high',
        action: `Remove "${removed.component}" from codemap — path ${removed.path} no longer exists`,
        command: '/doc-sync',
        detail: 'The codemap references a path that was deleted. Update ARCHITECTURE.md.',
      })
    }
  } catch {
    /* drift detection may fail without ARCHITECTURE.md */
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  suggestions.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9))

  return JSON.stringify(
    {
      service,
      score: health.score,
      maxScore: health.maxScore,
      percentage: Math.round((health.score / health.maxScore) * 100),
      suggestions,
      summary:
        suggestions.length === 0
          ? 'Documentation is complete — no updates needed.'
          : `${suggestions.length} suggestion(s): ${suggestions.filter((s) => s.priority === 'critical').length} critical, ${suggestions.filter((s) => s.priority === 'high').length} high, ${suggestions.filter((s) => s.priority === 'medium').length} medium, ${suggestions.filter((s) => s.priority === 'low').length} low.`,
    },
    null,
    2,
  )
}

function handleQueryDocs(cwd, params) {
  const repos = getRepos(cwd)
  const { service, type } = params

  if (!repos[service]) {
    return `Error: Service "${service}" not found. Available: ${Object.keys(repos).join(', ')}`
  }

  const repoPath = repos[service]
  if (!fs.existsSync(repoPath)) {
    return `Error: Service "${service}" path does not exist: ${repoPath}`
  }

  switch (type) {
    case 'invariants': {
      const archPath = path.join(repoPath, 'ARCHITECTURE.md')
      if (!fs.existsSync(archPath)) return JSON.stringify({ invariants: [] })
      const content = fs.readFileSync(archPath, 'utf-8')
      const invariants = parseInvariants(content)
      // Also extract ADR check comments
      const adrDir = path.join(repoPath, 'docs', 'adr')
      const adrChecks = []
      if (fs.existsSync(adrDir)) {
        for (const file of fs.readdirSync(adrDir).filter((f) => f.endsWith('.md') && f !== 'README.md')) {
          const adrContent = fs.readFileSync(path.join(adrDir, file), 'utf-8')
          const checks = adrContent.matchAll(/<!--\s*check:\s*(.+?)→\s*(.+?)\s*-->/g)
          for (const match of checks) {
            adrChecks.push({ source: `docs/adr/${file}`, check: match[1].trim(), expected: match[2].trim() })
          }
        }
      }
      return JSON.stringify({ service, invariants, adrChecks }, null, 2)
    }

    case 'codemap': {
      const archPath = path.join(repoPath, 'ARCHITECTURE.md')
      if (!fs.existsSync(archPath)) return JSON.stringify({ codemap: [] })
      const content = fs.readFileSync(archPath, 'utf-8')
      return JSON.stringify({ service, codemap: parseCodemap(content) }, null, 2)
    }

    case 'glossary': {
      const glossaryPath = path.join(repoPath, 'docs', 'glossary.md')
      if (!fs.existsSync(glossaryPath)) return JSON.stringify({ terms: [] })
      const content = fs.readFileSync(glossaryPath, 'utf-8')
      const terms = []
      let headerPassed = false
      for (const line of content.split('\n')) {
        if (line.includes('---') && line.includes('|')) {
          headerPassed = true
          continue
        }
        if (!headerPassed && line.startsWith('|')) {
          headerPassed = true
          continue
        }
        if (headerPassed && line.startsWith('|')) {
          const cells = line
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean)
          if (cells.length >= 2 && !cells[0].includes('[Term]')) {
            terms.push({ term: cells[0], definition: cells[1] })
          }
        }
      }
      return JSON.stringify({ service, terms }, null, 2)
    }

    case 'security-rules': {
      const secPath = path.join(repoPath, 'docs', 'security.md')
      if (!fs.existsSync(secPath)) return JSON.stringify({ rules: [] })
      const content = fs.readFileSync(secPath, 'utf-8')
      const rules = []
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^\d+\.\s+\*\*(.+?)\*\*\s*[-—:]\s*(.+)/)
        if (match) {
          rules.push({ rule: match[1], detail: match[2] })
        } else {
          const bulletMatch = lines[i].match(/^[-*]\s+\*\*(.+?)\*\*\s*[-—:]\s*(.+)/)
          if (bulletMatch) {
            rules.push({ rule: bulletMatch[1], detail: bulletMatch[2] })
          }
        }
      }
      // Fallback: extract numbered lines
      if (rules.length === 0) {
        for (const line of lines) {
          const numMatch = line.match(/^\d+\.\s+(.+)/)
          if (numMatch && numMatch[1].length > 10) {
            rules.push({ rule: numMatch[1] })
          }
        }
      }
      return JSON.stringify({ service, rules }, null, 2)
    }

    case 'service-dependencies': {
      const mapPath = path.join(repoPath, 'docs', 'service-map.md')
      if (!fs.existsSync(mapPath)) return JSON.stringify({ dependencies: [], consumers: [] })
      const content = fs.readFileSync(mapPath, 'utf-8')
      const dependencies = []
      const consumers = []
      let currentSection = null
      let headerPassed = false
      for (const line of content.split('\n')) {
        if (/## Dependencies/i.test(line)) {
          currentSection = 'deps'
          headerPassed = false
          continue
        }
        if (/## Consumers/i.test(line)) {
          currentSection = 'cons'
          headerPassed = false
          continue
        }
        if (/^## /.test(line)) {
          currentSection = null
          continue
        }
        if (line.includes('---') && line.includes('|')) {
          headerPassed = true
          continue
        }
        if (!headerPassed && line.startsWith('|')) {
          headerPassed = true
          continue
        }
        if (headerPassed && line.startsWith('|')) {
          const cells = line
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean)
          if (cells.length >= 2) {
            const entry = { name: cells[0], purpose: cells[1], protocol: cells[2] || '' }
            if (currentSection === 'deps') dependencies.push(entry)
            else if (currentSection === 'cons') consumers.push(entry)
          }
        }
      }
      return JSON.stringify({ service, dependencies, consumers }, null, 2)
    }

    case 'adr-rules': {
      const adrDir = path.join(repoPath, 'docs', 'adr')
      if (!fs.existsSync(adrDir)) return JSON.stringify({ adrs: [] })
      const adrs = []
      for (const file of fs
        .readdirSync(adrDir)
        .filter((f) => f.endsWith('.md') && f !== 'README.md')
        .sort()) {
        const content = fs.readFileSync(path.join(adrDir, file), 'utf-8')
        const titleMatch = content.match(/^#\s+(.+)/m)
        const rules = []
        let inRules = false
        for (const line of content.split('\n')) {
          if (/^## Rules/i.test(line)) {
            inRules = true
            continue
          }
          if (inRules && /^## /.test(line)) break
          if (inRules && /^[-*]\s+/.test(line)) {
            rules.push(line.replace(/^[-*]\s+/, '').trim())
          }
        }
        const checks = []
        for (const match of content.matchAll(/<!--\s*check:\s*(.+?)→\s*(.+?)\s*-->/g)) {
          checks.push({ check: match[1].trim(), expected: match[2].trim() })
        }
        adrs.push({
          file: `docs/adr/${file}`,
          title: titleMatch ? titleMatch[1] : file,
          rules,
          checks,
        })
      }
      return JSON.stringify({ service, adrs }, null, 2)
    }

    case 'feature-invariants': {
      const featDir = path.join(repoPath, 'docs', 'features')
      if (!fs.existsSync(featDir)) return JSON.stringify({ features: [] })
      const features = []
      for (const file of fs.readdirSync(featDir).filter((f) => f.endsWith('.md'))) {
        const content = fs.readFileSync(path.join(featDir, file), 'utf-8')
        const titleMatch = content.match(/^#\s+(.+)/m)
        const invariants = []
        let inInvariants = false
        for (const line of content.split('\n')) {
          if (/^## Invariants/i.test(line)) {
            inInvariants = true
            continue
          }
          if (inInvariants && /^## /.test(line)) break
          if (inInvariants) {
            // Table rows
            if (line.startsWith('|') && !line.includes('---')) {
              const cells = line
                .split('|')
                .map((c) => c.trim())
                .filter(Boolean)
              if (cells.length >= 2) {
                const cmdMatch = cells[1].match(/`([^`]+)`/)
                invariants.push({ rule: cells[0], check: cmdMatch ? cmdMatch[1] : cells[1] })
              }
            }
            // Bullet points
            if (/^[-*]\s+/.test(line)) {
              invariants.push({ rule: line.replace(/^[-*]\s+/, '').trim() })
            }
          }
        }
        features.push({
          file: `docs/features/${file}`,
          name: titleMatch ? titleMatch[1].replace(/^Feature:\s*/i, '') : file.replace('.md', ''),
          invariants,
        })
      }
      return JSON.stringify({ service, features }, null, 2)
    }

    case 'all-rules': {
      // Aggregate: all invariants + ADR rules + security rules + feature invariants
      const allRules = { service, architectureInvariants: [], adrRules: [], securityRules: [], featureInvariants: [] }

      // Architecture invariants
      const archPath = path.join(repoPath, 'ARCHITECTURE.md')
      if (fs.existsSync(archPath)) {
        allRules.architectureInvariants = parseInvariants(fs.readFileSync(archPath, 'utf-8'))
      }

      // ADR rules
      const adrResult = JSON.parse(handleQueryDocs(cwd, { service, type: 'adr-rules' }))
      for (const adr of adrResult.adrs || []) {
        for (const rule of adr.rules) {
          allRules.adrRules.push({ source: adr.file, rule })
        }
      }

      // Security rules
      const secResult = JSON.parse(handleQueryDocs(cwd, { service, type: 'security-rules' }))
      allRules.securityRules = secResult.rules || []

      // Feature invariants
      const featResult = JSON.parse(handleQueryDocs(cwd, { service, type: 'feature-invariants' }))
      for (const feat of featResult.features || []) {
        for (const inv of feat.invariants) {
          allRules.featureInvariants.push({ source: feat.file, ...inv })
        }
      }

      const total =
        allRules.architectureInvariants.length +
        allRules.adrRules.length +
        allRules.securityRules.length +
        allRules.featureInvariants.length
      allRules.totalRules = total

      return JSON.stringify(allRules, null, 2)
    }

    default:
      return `Error: Unknown query type "${type}". Available: invariants, codemap, glossary, security-rules, service-dependencies, adr-rules, feature-invariants, all-rules`
  }
}

function handleLintDocs(cwd, params) {
  const repos = getRepos(cwd)
  const { service } = params

  if (!repos[service]) {
    return `Error: Service "${service}" not found. Available: ${Object.keys(repos).join(', ')}`
  }
  if (!fs.existsSync(repos[service])) {
    return `Error: Service "${service}" path does not exist: ${repos[service]}`
  }

  const results = lintDocs(repos[service])
  const errors = results.filter((r) => r.severity === 'error')
  const warnings = results.filter((r) => r.severity === 'warn')

  return JSON.stringify(
    {
      service,
      results,
      summary: {
        errors: errors.length,
        warnings: warnings.length,
        total: results.length,
        clean: results.length === 0,
      },
    },
    null,
    2,
  )
}

function collectMarkdownFiles(dir, depth = 0) {
  if (depth > 3) return []
  const files = []
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath)
      } else if (entry.isDirectory() && ['docs', 'adr', 'features'].includes(entry.name)) {
        files.push(...collectMarkdownFiles(fullPath, depth + 1))
      }
    }
  } catch {
    /* skip unreadable dirs */
  }
  return files
}

// JSON-RPC 2.0 helpers
function jsonRpcResponse(id, result) {
  return JSON.stringify({ jsonrpc: '2.0', id, result })
}

function jsonRpcError(id, code, message) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })
}

export function startMcpServer(cwd) {
  let buffer = ''

  process.stdin.on('data', (chunk) => {
    buffer += chunk.toString()

    // MCP uses Content-Length headers for framing
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) break

      const header = buffer.slice(0, headerEnd)
      const lengthMatch = header.match(/Content-Length:\s*(\d+)/i)
      if (!lengthMatch) {
        buffer = buffer.slice(headerEnd + 4)
        continue
      }

      const contentLength = Number.parseInt(lengthMatch[1], 10)
      const bodyStart = headerEnd + 4
      if (buffer.length < bodyStart + contentLength) break

      const body = buffer.slice(bodyStart, bodyStart + contentLength)
      buffer = buffer.slice(bodyStart + contentLength)

      try {
        const msg = JSON.parse(body)
        handleMessage(msg, cwd)
      } catch (err) {
        console.error(`[forgedocs-mcp] Parse error: ${err.message}`)
      }
    }
  })

  process.stdin.on('end', () => {
    // Stdin closed — parent process disconnected. Clean shutdown.
    // Note: this is the only process.exit in lib/; acceptable for a long-running server.
    process.exitCode = 0
  })

  console.error('[forgedocs-mcp] MCP server running on stdio')
}

function send(data) {
  const json = typeof data === 'string' ? data : JSON.stringify(data)
  const msg = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`
  process.stdout.write(msg)
}

function handleMessage(msg, cwd) {
  const { id, method, params } = msg

  switch (method) {
    case 'initialize':
      send(
        jsonRpcResponse(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        }),
      )
      break

    case 'notifications/initialized':
      // Client acknowledged initialization — nothing to send
      break

    case 'tools/list':
      send(jsonRpcResponse(id, { tools: TOOLS }))
      break

    case 'tools/call': {
      const toolName = params?.name
      const toolArgs = params?.arguments || {}
      let resultText

      try {
        switch (toolName) {
          case 'list_services':
            resultText = handleListServices(cwd)
            break
          case 'get_service_docs':
            resultText = handleGetServiceDocs(cwd, toolArgs)
            break
          case 'search_docs':
            resultText = handleSearchDocs(cwd, toolArgs)
            break
          case 'check_freshness':
            resultText = handleCheckFreshness(cwd, toolArgs)
            break
          case 'get_health_score':
            resultText = handleHealthScore(cwd, toolArgs)
            break
          case 'get_codemap':
            resultText = handleGetCodemap(cwd, toolArgs)
            break
          case 'check_drift':
            resultText = handleCheckDrift(cwd, toolArgs)
            break
          case 'suggest_updates':
            resultText = handleSuggestUpdates(cwd, toolArgs)
            break
          case 'query_docs':
            resultText = handleQueryDocs(cwd, toolArgs)
            break
          case 'lint_docs':
            resultText = handleLintDocs(cwd, toolArgs)
            break
          default:
            send(jsonRpcError(id, -32601, `Unknown tool: ${toolName}`))
            return
        }
        send(jsonRpcResponse(id, { content: [{ type: 'text', text: resultText }] }))
      } catch (err) {
        send(
          jsonRpcResponse(id, {
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true,
          }),
        )
      }
      break
    }

    case 'ping':
      send(jsonRpcResponse(id, {}))
      break

    default:
      if (id !== undefined) {
        send(jsonRpcError(id, -32601, `Method not found: ${method}`))
      }
  }
}
