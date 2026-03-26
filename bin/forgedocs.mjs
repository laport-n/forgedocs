#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { loadConfig, loadReposConfig, saveReposConfig } from '../lib/config.mjs'
import { detectScanDirs, isValidRepo, scanForRepos } from '../lib/discovery.mjs'
import { installTemplates } from '../lib/installer.mjs'
import { linkRepos } from '../lib/linker.mjs'
import { startMcpServer } from '../lib/mcp-server.mjs'
import { expandHome } from '../lib/utils.mjs'

// PKG_ROOT = where forgedocs is installed (templates, vitepress config, node_modules)
// CWD = where the user runs the command (repos.json, content/, docsite.config.mjs)
const PKG_ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname))
const CWD = process.cwd()
const CONFIG_PATH = path.join(CWD, '.repos.json')
const CONTENT_DIR = path.join(CWD, 'content')
const TEMPLATES_DIR = path.join(PKG_ROOT, 'templates')

const VERSION = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf-8')).version

const HELP = `
forgedocs v${VERSION} — Architecture documentation framework

Usage: forgedocs <command> [options]

Commands:
  init                     Interactive setup — discover and link repos
  mcp                      Start MCP server (for Claude Code integration)
  dev                      Start the documentation dev server
  build                    Build static documentation site
  preview                  Preview the built site
  add <path>               Add a specific repo by path
  remove <name>            Remove a repo from the documentation site
  status                   Show status of all tracked repos
  install <path> [--force] Install Claude Code commands into a repo
  doctor                   Diagnose common issues
  help                     Show this help

Options:
  --verbose, -v            Show detailed debug output
  --help, -h               Show this help
  --version                Show version
`

const command = process.argv[2]
const args = process.argv.slice(3)
const hasFlag = (flag) => args.includes(flag)

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/** Ensure VitePress config and index.md exist in CWD (copy from package if needed) */
function ensureVitepressFiles() {
  const configDest = path.join(CWD, '.vitepress', 'config.ts')
  if (!fs.existsSync(configDest)) {
    fs.mkdirSync(path.join(CWD, '.vitepress'), { recursive: true })
    fs.copyFileSync(path.join(PKG_ROOT, '.vitepress', 'config.ts'), configDest)
  }
  const indexDest = path.join(CWD, 'index.md')
  if (!fs.existsSync(indexDest)) {
    fs.copyFileSync(path.join(PKG_ROOT, 'index.md'), indexDest)
  }
  const configMjsDest = path.join(CWD, 'docsite.config.mjs')
  if (!fs.existsSync(configMjsDest)) {
    fs.copyFileSync(path.join(PKG_ROOT, 'docsite.config.mjs'), configMjsDest)
  }
}

async function cmdInit() {
  const config = await loadConfig(CWD)
  const homeDir = (await import('node:os')).default.homedir()

  console.log('\nForgedocs Setup\n')

  const repos = loadReposConfig(CONFIG_PATH) || {}

  // Validate existing entries
  for (const [name, repoPath] of Object.entries(repos)) {
    if (fs.existsSync(repoPath) && isValidRepo(repoPath)) {
      console.log(`  OK: ${name} -> ${repoPath}`)
    } else {
      console.log(`  Removed: ${name} -> ${repoPath} (not found)`)
      delete repos[name]
    }
  }

  // Build search directories: configured + auto-detected
  const configuredDirs = config.scanDirs.map((d) => expandHome(d))
  const detectedDirs = detectScanDirs(homeDir)
  const allDirs = new Set([path.resolve(CWD, '..'), ...configuredDirs, ...detectedDirs])

  // Auto-detect new repos
  console.log('Scanning for repositories...\n')
  const discovered = {}
  for (const searchDir of allDirs) {
    const found = scanForRepos(searchDir, config.nestedDirs, { maxDepth: config.maxDepth })
    for (const [name, repoPath] of Object.entries(found)) {
      if (!repos[name]) {
        discovered[name] = repoPath
      }
    }
  }

  // Interactive selection
  if (Object.keys(discovered).length > 0) {
    console.log(`Found ${Object.keys(discovered).length} new repo(s):\n`)
    const entries = Object.entries(discovered).sort(([a], [b]) => a.localeCompare(b))

    for (let i = 0; i < entries.length; i++) {
      const [name, repoPath] = entries[i]
      console.log(`  [${i + 1}] ${name}`)
      console.log(`      ${repoPath}`)
    }

    console.log()
    const answer = await ask('Which repos to add? (a=all, comma-separated numbers, or enter to skip): ')

    if (answer.toLowerCase() === 'a' || answer.toLowerCase() === 'all') {
      for (const [name, repoPath] of entries) {
        repos[name] = repoPath
        console.log(`  Added: ${name}`)
      }
    } else if (answer) {
      const indices = answer
        .split(',')
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n))
      for (const idx of indices) {
        if (idx >= 1 && idx <= entries.length) {
          const [name, repoPath] = entries[idx - 1]
          repos[name] = repoPath
          console.log(`  Added: ${name}`)
        }
      }
    }
  } else {
    console.log('  No new repos found.\n')
  }

  // Let user add more manually
  while (true) {
    const input = await ask('\nAdd a repo manually? (path or enter to skip): ')
    if (!input) break
    const resolved = path.resolve(expandHome(input))
    if (!isValidRepo(resolved)) {
      console.log(`  No ARCHITECTURE.md found at ${resolved}`)
      continue
    }
    const name = path.basename(resolved)
    repos[name] = resolved
    console.log(`  Added: ${name} -> ${resolved}`)
  }

  saveReposConfig(CONFIG_PATH, repos)
  console.log(`\nConfig saved (${Object.keys(repos).length} repos)`)

  console.log('\nCreating links\n')
  linkRepos(repos, CONTENT_DIR, CWD)

  ensureVitepressFiles()

  console.log('\nSetup complete! Run: forgedocs dev\n')
}

async function cmdDev() {
  await ensureSetup()
  ensureVitepressFiles()
  const { execFileSync } = await import('node:child_process')
  execFileSync('npx', ['vitepress', 'dev'], { cwd: CWD, stdio: 'inherit' })
}

async function cmdBuild() {
  await ensureSetup()
  ensureVitepressFiles()
  const { execFileSync } = await import('node:child_process')
  execFileSync('npx', ['vitepress', 'build'], { cwd: CWD, stdio: 'inherit' })
}

async function cmdPreview() {
  const { execFileSync } = await import('node:child_process')
  execFileSync('npx', ['vitepress', 'preview'], { cwd: CWD, stdio: 'inherit' })
}

function cmdAdd() {
  const targetPath = args.find((a) => !a.startsWith('-'))
  if (!targetPath) {
    console.error('Usage: forgedocs add <path>')
    process.exit(1)
  }

  const resolved = path.resolve(expandHome(targetPath))
  if (!isValidRepo(resolved)) {
    console.error(`No ARCHITECTURE.md found at ${resolved}`)
    process.exit(1)
  }

  const name = path.basename(resolved)
  const repos = loadReposConfig(CONFIG_PATH) || {}
  repos[name] = resolved
  saveReposConfig(CONFIG_PATH, repos)
  console.log(`Added ${name} -> ${resolved}`)
  linkRepos(repos, CONTENT_DIR, CWD)
  console.log('\nNote: Restart `forgedocs dev` if the dev server is running to see the new repo.')
}

function cmdRemove() {
  const repoName = args.find((a) => !a.startsWith('-'))
  if (!repoName) {
    console.error('Usage: forgedocs remove <name>')
    process.exit(1)
  }

  const repos = loadReposConfig(CONFIG_PATH)
  if (!repos || !Object.hasOwn(repos, repoName)) {
    console.error(`Repo "${repoName}" not found in config.`)
    const available = repos ? Object.keys(repos) : []
    if (available.length > 0) {
      console.error(`Available repos: ${available.join(', ')}`)
    }
    process.exit(1)
  }

  delete repos[repoName]
  saveReposConfig(CONFIG_PATH, repos)
  console.log(`Removed "${repoName}" from config.`)
  linkRepos(repos, CONTENT_DIR, CWD)
}

function cmdStatus() {
  const jsonOutput = hasFlag('--json')
  const repos = loadReposConfig(CONFIG_PATH)
  if (!repos || Object.keys(repos).length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ repos: {} }))
    } else {
      console.log('No repos configured. Run: forgedocs init')
    }
    return
  }

  const result = {}

  for (const [name, repoPath] of Object.entries(repos)) {
    const exists = fs.existsSync(repoPath)
    const hasArch = exists && isValidRepo(repoPath)
    const hasDocs = exists && fs.existsSync(path.join(repoPath, 'docs'))
    const hasClaude = exists && fs.existsSync(path.join(repoPath, 'CLAUDE.md'))
    const linkOk = fs.existsSync(path.join(CONTENT_DIR, name))

    const status = !exists ? 'MISSING' : !hasArch ? 'NO ARCH' : 'OK'

    let featureCount = 0
    let adrCount = 0
    if (exists) {
      const docsFeatures = path.join(repoPath, 'docs', 'features')
      if (fs.existsSync(docsFeatures)) {
        featureCount = fs.readdirSync(docsFeatures).filter((f) => f.endsWith('.md')).length
      }
      const docsAdr = path.join(repoPath, 'docs', 'adr')
      if (fs.existsSync(docsAdr)) {
        adrCount = fs.readdirSync(docsAdr).filter((f) => f.endsWith('.md') && f !== 'README.md').length
      }
    }

    result[name] = { path: repoPath, status, hasDocs, hasClaude, linkOk, featureCount, adrCount }
  }

  if (jsonOutput) {
    console.log(JSON.stringify({ repos: result }, null, 2))
    return
  }

  console.log(`\nTracked repositories (${Object.keys(repos).length}):\n`)

  for (const [name, info] of Object.entries(result)) {
    const statusIcon = info.status === 'OK' ? '\u2705' : info.status === 'MISSING' ? '\u274C' : '\u26A0\uFE0F'

    console.log(`  ${statusIcon} ${name}`)
    console.log(`     Path: ${info.path}`)
    console.log(`     Status: ${info.status}`)
    if (info.status !== 'MISSING') {
      const features = []
      if (info.hasDocs) features.push('docs/')
      if (info.hasClaude) features.push('CLAUDE.md')
      if (info.featureCount > 0) features.push(`${info.featureCount} features`)
      if (info.adrCount > 0) features.push(`${info.adrCount} ADRs`)
      if (features.length > 0) console.log(`     Docs: ${features.join(', ')}`)
    }
    if (!info.linkOk) console.log('     Link: broken (run forgedocs init)')
    console.log()
  }
}

function cmdInstall() {
  const targetPath = args.find((a) => !a.startsWith('-'))
  if (!targetPath) {
    console.error('Usage: forgedocs install <path> [--force]')
    process.exit(1)
  }

  const force = hasFlag('--force')
  const targetRepo = path.resolve(expandHome(targetPath))

  if (!fs.existsSync(targetRepo)) {
    console.error(`Directory not found: ${targetRepo}`)
    process.exit(1)
  }

  const hasGit = fs.existsSync(path.join(targetRepo, '.git'))
  if (!hasGit) {
    console.error(`Warning: ${targetRepo} doesn't look like a git repository (no .git/)`)
  }

  const { installed, updated, skipped } = installTemplates(TEMPLATES_DIR, targetRepo, { force })

  console.log(`\nForgedocs — ${path.basename(targetRepo)}\n`)

  if (installed.length > 0) {
    console.log('Installed:')
    for (const f of installed) console.log(`  ${f}`)
  }

  if (updated.length > 0) {
    console.log('\nUpdated (--force):')
    for (const f of updated) console.log(`  ${f}`)
  }

  if (skipped.length > 0) {
    console.log('\nSkipped:')
    for (const f of skipped) console.log(`  ${f}`)
  }

  const totalChanges = installed.length + updated.length
  if (totalChanges === 0 && skipped.length > 0) {
    console.log('\nAll files already installed. Use --force to update.')
  } else if (totalChanges > 0) {
    console.log(`
Next steps:
  1. cd ${targetRepo}
  2. Open Claude Code
  3. Run /doc-init to generate the full documentation structure
`)
  }
}

function cmdDoctor() {
  const jsonOutput = hasFlag('--json')
  const checks = []
  let issues = 0

  function addCheck(name, status, message) {
    checks.push({ name, status, message })
    if (status === 'error' || status === 'warn') issues++
  }

  // Check Node.js version
  const nodeVersion = process.versions.node.split('.').map(Number)
  if (nodeVersion[0] < 20) {
    addCheck('node', 'error', `Node.js ${process.versions.node} — requires >= 20.0.0`)
  } else {
    addCheck('node', 'ok', `Node.js ${process.versions.node}`)
  }

  // Check .repos.json
  try {
    const repos = loadReposConfig(CONFIG_PATH)
    if (!repos) {
      addCheck('repos-config', 'warn', 'No .repos.json found — run: forgedocs init')
    } else {
      const count = Object.keys(repos).length
      addCheck('repos-config', 'ok', `.repos.json (${count} repos)`)

      for (const [name, repoPath] of Object.entries(repos)) {
        if (!fs.existsSync(repoPath)) {
          addCheck(`repo:${name}`, 'error', `path not found (${repoPath})`)
        } else if (!isValidRepo(repoPath)) {
          addCheck(`repo:${name}`, 'warn', 'no ARCHITECTURE.md')
        }
      }
    }
  } catch (err) {
    addCheck('repos-config', 'error', `.repos.json is corrupted: ${err.message}`)
  }

  // Check content/ directory
  if (!fs.existsSync(CONTENT_DIR)) {
    addCheck('content-dir', 'warn', 'content/ directory missing — run: forgedocs init')
  } else {
    const links = fs.readdirSync(CONTENT_DIR)
    let brokenLinks = 0
    for (const link of links) {
      const linkPath = path.join(CONTENT_DIR, link)
      try {
        fs.statSync(linkPath)
      } catch {
        brokenLinks++
      }
    }
    if (brokenLinks > 0) {
      addCheck('content-dir', 'warn', `${brokenLinks} broken symlink(s) in content/ — run: forgedocs init`)
    } else {
      addCheck('content-dir', 'ok', `content/ (${links.length} linked repos)`)
    }
  }

  // Check VitePress
  const vitepressPath = path.join(PKG_ROOT, 'node_modules', 'vitepress')
  if (!fs.existsSync(vitepressPath)) {
    addCheck('vitepress', 'error', 'VitePress not installed — run: npm install')
  } else {
    addCheck('vitepress', 'ok', 'VitePress installed')
  }

  // Check docsite.config.mjs
  const configExists = fs.existsSync(path.join(CWD, 'docsite.config.mjs'))
  addCheck(
    'config',
    configExists ? 'ok' : 'warn',
    `docsite.config.mjs ${configExists ? 'found' : 'not found (using defaults)'}`,
  )

  if (jsonOutput) {
    console.log(JSON.stringify({ checks, issueCount: issues }, null, 2))
    return
  }

  console.log('\nForgedocs Doctor\n')
  for (const check of checks) {
    const icon = check.status === 'ok' ? '\u2705' : check.status === 'error' ? '\u274C' : '\u26A0\uFE0F '
    console.log(`  ${icon} ${check.message}`)
  }

  console.log()
  if (issues === 0) {
    console.log('  No issues found!\n')
  } else {
    console.log(`  ${issues} issue(s) found.\n`)
  }
}

function cmdMcp() {
  startMcpServer(CWD)
}

async function ensureSetup() {
  const repos = loadReposConfig(CONFIG_PATH)
  if (!repos) {
    console.log('No repos configured. Run: forgedocs init\n')
    process.exit(1)
  }
  let needsRefresh = !fs.existsSync(CONTENT_DIR)
  if (!needsRefresh) {
    for (const name of Object.keys(repos)) {
      if (!fs.existsSync(path.join(CONTENT_DIR, name))) {
        needsRefresh = true
        break
      }
    }
  }
  if (needsRefresh) {
    console.log('Refreshing links...')
    linkRepos(repos, CONTENT_DIR, CWD)
  }
}

async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP)
    process.exit(0)
  }

  if (command === '--version') {
    console.log(VERSION)
    process.exit(0)
  }

  switch (command) {
    case 'init':
      return cmdInit()
    case 'dev':
      return cmdDev()
    case 'build':
      return cmdBuild()
    case 'preview':
      return cmdPreview()
    case 'add':
      return cmdAdd()
    case 'remove':
      return cmdRemove()
    case 'status':
      return cmdStatus()
    case 'install':
      return cmdInstall()
    case 'doctor':
      return cmdDoctor()
    case 'mcp':
      return cmdMcp()
    default:
      console.error(`Unknown command: ${command}`)
      console.log(HELP)
      process.exit(1)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
