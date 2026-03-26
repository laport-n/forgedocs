import fs from 'node:fs'
import path from 'node:path'
import { loadReposConfig } from './config.mjs'

/**
 * Lightweight MCP server for Forgedocs.
 * Implements JSON-RPC 2.0 over stdio (the MCP protocol) without external dependencies.
 *
 * Tools:
 *   - list_services: list all tracked repos with metadata
 *   - get_service_docs: read a specific doc from a service
 *   - search_docs: full-text search across all linked repos
 *   - check_freshness: check doc freshness and staleness
 */

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = { name: 'forgedocs', version: '0.5.0' }

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
    if (exists) {
      const featDir = path.join(repoPath, 'docs', 'features')
      if (fs.existsSync(featDir)) {
        featureCount = fs.readdirSync(featDir).filter((f) => f.endsWith('.md')).length
      }
      const adrDir = path.join(repoPath, 'docs', 'adr')
      if (fs.existsSync(adrDir)) {
        adrCount = fs.readdirSync(adrDir).filter((f) => f.endsWith('.md') && f !== 'README.md').length
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
      adrCount,
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

  process.stdin.on('end', () => process.exit(0))

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
