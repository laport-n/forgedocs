import fs from 'node:fs'
import path from 'node:path'

/**
 * Agent registry — defines conventions, detection, and capabilities for each supported AI coding agent.
 * Adding a new agent requires only a new entry here + a renderer in instruction-gen.mjs.
 */
export const agents = {
  claude: {
    name: 'Claude Code',
    instructionFile: 'CLAUDE.md',
    mcpConfig: { path: '.claude/settings.json', format: 'claude-settings' },
    supports: { commands: true, skills: true, hooks: true, mcp: true },
  },
  cursor: {
    name: 'Cursor',
    instructionFile: '.cursor/rules/forgedocs.mdc',
    mcpConfig: { path: '.cursor/mcp.json', format: 'simple-mcp' },
    supports: { commands: false, skills: false, hooks: false, mcp: true },
  },
  windsurf: {
    name: 'Windsurf',
    instructionFile: '.windsurfrules',
    mcpConfig: { path: '.windsurf/mcp.json', format: 'simple-mcp' },
    supports: { commands: false, skills: false, hooks: false, mcp: true },
  },
  copilot: {
    name: 'GitHub Copilot',
    instructionFile: '.github/copilot-instructions.md',
    mcpConfig: null,
    supports: { commands: false, skills: false, hooks: false, mcp: false },
  },
  cline: {
    name: 'Cline',
    instructionFile: '.clinerules',
    mcpConfig: { path: '.cline/mcp.json', format: 'simple-mcp' },
    supports: { commands: false, skills: false, hooks: false, mcp: true },
  },
}

/**
 * Detect which agents are present in a repository by checking for their config directories or files.
 * Returns array of agent keys (e.g. ['claude', 'cursor']).
 */
export function detectAgents(repoPath) {
  const detected = []
  for (const key of Object.keys(agents)) {
    if (detectAgent(repoPath, key)) {
      detected.push(key)
    }
  }
  return detected
}

function detectAgent(repoPath, key) {
  switch (key) {
    case 'claude':
      return fs.existsSync(path.join(repoPath, '.claude'))
    case 'cursor':
      return fs.existsSync(path.join(repoPath, '.cursor')) || fs.existsSync(path.join(repoPath, '.cursorrules'))
    case 'windsurf':
      return fs.existsSync(path.join(repoPath, '.windsurf')) || fs.existsSync(path.join(repoPath, '.windsurfrules'))
    case 'copilot':
      return fs.existsSync(path.join(repoPath, '.github', 'copilot-instructions.md'))
    case 'cline':
      return fs.existsSync(path.join(repoPath, '.cline')) || fs.existsSync(path.join(repoPath, '.clinerules'))
    default:
      return false
  }
}

/**
 * Resolve the --agents flag value to a list of agent keys.
 * - 'auto' (default): detect agents, fall back to ['claude']
 * - 'all': every agent in the registry
 * - 'claude,cursor': comma-separated list
 */
export function resolveAgents(agentsFlag, repoPath) {
  if (!agentsFlag || agentsFlag === 'auto') {
    const detected = detectAgents(repoPath)
    return detected.length > 0 ? detected : ['claude']
  }
  if (agentsFlag === 'all') {
    return Object.keys(agents)
  }
  const requested = agentsFlag.split(',').map((s) => s.trim())
  for (const key of requested) {
    if (!agents[key]) {
      throw new Error(`Unknown agent: ${key}. Available: ${Object.keys(agents).join(', ')}`)
    }
  }
  return requested
}

/**
 * Check if any agent instruction file exists in a repository.
 * Returns { found: boolean, files: string[] } with the relative paths of found instruction files.
 */
export function findInstructionFiles(repoPath) {
  const files = []
  for (const agent of Object.values(agents)) {
    const filePath = path.join(repoPath, agent.instructionFile)
    if (fs.existsSync(filePath)) {
      files.push(agent.instructionFile)
    }
  }
  return { found: files.length > 0, files }
}

/**
 * Register the forgedocs MCP server in an agent's config file.
 * Merges with existing config if present.
 */
export function registerMcp(agentKey, repoPath) {
  const agent = agents[agentKey]
  if (!agent?.mcpConfig) return { registered: false, reason: 'no MCP support' }

  const configPath = path.join(repoPath, agent.mcpConfig.path)

  if (agent.mcpConfig.format === 'claude-settings') {
    // Claude uses settings.json with mcpServers nested inside
    let settings = {}
    if (fs.existsSync(configPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      } catch {
        /* start fresh */
      }
    }
    if (settings.mcpServers?.forgedocs) {
      return { registered: false, reason: 'already configured' }
    }
    settings.mcpServers = settings.mcpServers || {}
    settings.mcpServers.forgedocs = {
      command: 'npx',
      args: ['forgedocs', 'mcp'],
      description: 'Documentation tools — search, health scores, drift detection, codemap, and update suggestions',
    }
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.writeFileSync(configPath, `${JSON.stringify(settings, null, 2)}\n`)
    return { registered: true }
  }

  if (agent.mcpConfig.format === 'simple-mcp') {
    // Cursor, Windsurf, Cline use a simple { mcpServers: { ... } } format
    let config = {}
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      } catch {
        /* start fresh */
      }
    }
    if (config.mcpServers?.forgedocs) {
      return { registered: false, reason: 'already configured' }
    }
    config.mcpServers = config.mcpServers || {}
    config.mcpServers.forgedocs = {
      command: 'npx',
      args: ['forgedocs', 'mcp'],
    }
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
    return { registered: true }
  }

  return { registered: false, reason: 'unknown format' }
}
