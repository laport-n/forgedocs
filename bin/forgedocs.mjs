#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { loadConfig, loadReposConfig, saveReposConfig } from '../lib/config.mjs'
import { isValidRepo, scanForRepos } from '../lib/discovery.mjs'
import { installTemplates } from '../lib/installer.mjs'
import { linkRepos } from '../lib/linker.mjs'
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

async function askAddMore() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question('Add a repo manually? (path or empty to skip): ', (answer) => {
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

  // Build search directories
  const searchDirs = [path.resolve(CWD, '..'), ...config.scanDirs.map((d) => expandHome(d))]

  // Auto-detect new repos
  console.log('\nScanning for repositories...\n')
  for (const searchDir of searchDirs) {
    const found = scanForRepos(searchDir, config.nestedDirs)
    for (const [name, repoPath] of Object.entries(found)) {
      if (!repos[name]) {
        repos[name] = repoPath
        console.log(`  Found: ${name} -> ${repoPath}`)
      }
    }
  }

  if (Object.keys(repos).length === 0) {
    console.log('  No repos found automatically.\n')
  }

  // Let user add more
  while (true) {
    const input = await askAddMore()
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
}

function cmdRemove() {
  const repoName = args.find((a) => !a.startsWith('-'))
  if (!repoName) {
    console.error('Usage: forgedocs remove <name>')
    process.exit(1)
  }

  const repos = loadReposConfig(CONFIG_PATH)
  if (!repos?.hasOwnProperty(repoName)) {
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
  const repos = loadReposConfig(CONFIG_PATH)
  if (!repos || Object.keys(repos).length === 0) {
    console.log('No repos configured. Run: forgedocs init')
    return
  }

  console.log(`\nTracked repositories (${Object.keys(repos).length}):\n`)

  for (const [name, repoPath] of Object.entries(repos)) {
    const exists = fs.existsSync(repoPath)
    const hasArch = exists && isValidRepo(repoPath)
    const hasDocs = exists && fs.existsSync(path.join(repoPath, 'docs'))
    const hasClaude = exists && fs.existsSync(path.join(repoPath, 'CLAUDE.md'))
    const linkOk = fs.existsSync(path.join(CONTENT_DIR, name))

    const status = !exists ? 'MISSING' : !hasArch ? 'NO ARCH' : 'OK'
    const statusIcon = status === 'OK' ? '\u2705' : status === 'MISSING' ? '\u274C' : '\u26A0\uFE0F'

    console.log(`  ${statusIcon} ${name}`)
    console.log(`     Path: ${repoPath}`)
    console.log(`     Status: ${status}`)
    if (exists) {
      const features = []
      if (hasDocs) features.push('docs/')
      if (hasClaude) features.push('CLAUDE.md')
      const docsFeatures = path.join(repoPath, 'docs', 'features')
      if (fs.existsSync(docsFeatures)) {
        const featureCount = fs.readdirSync(docsFeatures).filter((f) => f.endsWith('.md')).length
        if (featureCount > 0) features.push(`${featureCount} features`)
      }
      const docsAdr = path.join(repoPath, 'docs', 'adr')
      if (fs.existsSync(docsAdr)) {
        const adrCount = fs.readdirSync(docsAdr).filter((f) => f.endsWith('.md') && f !== 'README.md').length
        if (adrCount > 0) features.push(`${adrCount} ADRs`)
      }
      if (features.length > 0) console.log(`     Docs: ${features.join(', ')}`)
    }
    if (!linkOk) console.log('     Link: broken (run forgedocs init)')
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
  console.log('\nForgedocs Doctor\n')
  let issues = 0

  // Check Node.js version
  const nodeVersion = process.versions.node.split('.').map(Number)
  if (nodeVersion[0] < 20) {
    console.log(`  \u274C Node.js ${process.versions.node} — requires >= 20.0.0`)
    issues++
  } else {
    console.log(`  \u2705 Node.js ${process.versions.node}`)
  }

  // Check .repos.json
  try {
    const repos = loadReposConfig(CONFIG_PATH)
    if (!repos) {
      console.log('  \u26A0\uFE0F  No .repos.json found — run: forgedocs init')
      issues++
    } else {
      const count = Object.keys(repos).length
      console.log(`  \u2705 .repos.json (${count} repos)`)

      // Validate each repo
      let brokenCount = 0
      for (const [name, repoPath] of Object.entries(repos)) {
        if (!fs.existsSync(repoPath)) {
          console.log(`  \u274C ${name}: path not found (${repoPath})`)
          brokenCount++
          issues++
        } else if (!isValidRepo(repoPath)) {
          console.log(`  \u26A0\uFE0F  ${name}: no ARCHITECTURE.md`)
          issues++
        }
      }
      if (brokenCount === 0) {
        console.log('  \u2705 All repo paths valid')
      }
    }
  } catch (err) {
    console.log(`  \u274C .repos.json is corrupted: ${err.message}`)
    issues++
  }

  // Check content/ directory
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log('  \u26A0\uFE0F  content/ directory missing — run: forgedocs init')
    issues++
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
      console.log(`  \u26A0\uFE0F  ${brokenLinks} broken symlink(s) in content/ — run: forgedocs init`)
      issues++
    } else {
      console.log(`  \u2705 content/ (${links.length} linked repos)`)
    }
  }

  // Check VitePress
  const vitepressPath = path.join(PKG_ROOT, 'node_modules', 'vitepress')
  if (!fs.existsSync(vitepressPath)) {
    console.log('  \u274C VitePress not installed — run: npm install')
    issues++
  } else {
    console.log('  \u2705 VitePress installed')
  }

  // Check docsite.config.mjs
  const configExists = fs.existsSync(path.join(CWD, 'docsite.config.mjs'))
  console.log(
    `  ${configExists ? '\u2705' : '\u26A0\uFE0F'} docsite.config.mjs ${configExists ? 'found' : 'not found (using defaults)'}`,
  )

  console.log()
  if (issues === 0) {
    console.log('  No issues found!\n')
  } else {
    console.log(`  ${issues} issue(s) found.\n`)
  }
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
