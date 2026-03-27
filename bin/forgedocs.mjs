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
  quickstart [path]        Bootstrap docs in a repo (detect stack, scaffold, install commands)
  dev                      Start the documentation dev server
  build                    Build static documentation site
  preview                  Preview the built site
  add <path>               Add a specific repo by path
  remove <name>            Remove a repo from the documentation site
  status                   Show status of all tracked repos
  score [path]             Show doc health score for a repo or all tracked repos
  badge [path]             Generate SVG doc health badge
  diff [path]              Detect documentation drift (codemap vs filesystem)
  lint [path]              Lint documentation (broken refs, stale placeholders, structure)
  export <format> [path]   Export docs (formats: json, html)
  watch                    Watch tracked repos for changes that need doc updates
  install <path> [--force] Install Claude Code commands into a repo
  doctor                   Diagnose common issues
  mcp                      Start MCP server (for Claude Code integration)
  help                     Show this help

Options:
  --verbose, -v            Show detailed debug output
  --help, -h               Show this help
  --version                Show version
  --json                   Machine-readable output (on status, score, doctor, diff)
  --preset <name>          Stack preset for quickstart (nextjs, react, fastapi, django, express, nestjs, rails, go, rust)
  --force                  Overwrite existing files
  --output, -o <file>      Output file path (for badge, export)
`

const command = process.argv[2]
const args = process.argv.slice(3)
const hasFlag = (flag) => args.includes(flag)
const getFlagValue = (flag) => {
  const idx = args.indexOf(flag)
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null
}
const getPositionalArg = () => args.find((a) => !a.startsWith('-'))

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

async function cmdQuickstart() {
  const { quickstart, listPresets } = await import('../lib/quickstart.mjs')

  const targetPath = getPositionalArg() || CWD
  const targetDir = path.resolve(expandHome(targetPath))
  const preset = getFlagValue('--preset')
  const force = hasFlag('--force')

  if (!fs.existsSync(targetDir)) {
    console.error(`Directory not found: ${targetDir}`)
    process.exit(1)
  }

  console.log(`\nForgedocs Quickstart\n`)
  console.log(`  Target: ${targetDir}`)

  if (preset) {
    const valid = listPresets().map((p) => p.key)
    if (!valid.includes(preset)) {
      console.error(`  Unknown preset: ${preset}`)
      console.error(`  Available: ${valid.join(', ')}`)
      process.exit(1)
    }
  }

  const result = quickstart(targetDir, TEMPLATES_DIR, { preset, force })

  if (result.preset) {
    console.log(`  Detected: ${result.preset}`)
  }
  console.log()

  if (result.created.length > 0) {
    console.log('  Created:')
    for (const f of result.created) console.log(`    + ${f}`)
  }

  if (result.commandsInstalled.length > 0) {
    console.log('\n  Claude commands installed:')
    for (const f of result.commandsInstalled) console.log(`    + ${f}`)
  }

  if (result.skipped.length > 0) {
    console.log('\n  Skipped (already exists):')
    for (const f of result.skipped) console.log(`    - ${f}`)
  }

  console.log(`
Next steps:
  1. Edit ARCHITECTURE.md — fill in the [To be documented] sections
  2. Run: forgedocs add ${targetDir}
  3. Run: forgedocs dev
  Or open Claude Code and run /doc-init for AI-assisted generation.
`)
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
  const targetPath = getPositionalArg()
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
  const repoName = getPositionalArg()
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

async function cmdScore() {
  const { calculateHealth, formatHealthReport } = await import('../lib/health.mjs')
  const jsonOutput = hasFlag('--json')
  const targetPath = getPositionalArg()

  if (targetPath) {
    // Score a single repo
    const resolved = path.resolve(expandHome(targetPath))
    if (!fs.existsSync(resolved)) {
      console.error(`Directory not found: ${resolved}`)
      process.exit(1)
    }
    const health = calculateHealth(resolved)
    if (jsonOutput) {
      console.log(JSON.stringify({ name: path.basename(resolved), ...health }, null, 2))
    } else {
      console.log(`\n${formatHealthReport(path.basename(resolved), health)}`)
    }
    return
  }

  // Score all tracked repos
  const repos = loadReposConfig(CONFIG_PATH)
  if (!repos || Object.keys(repos).length === 0) {
    console.log('No repos configured. Run: forgedocs init')
    return
  }

  const results = {}
  let totalScore = 0
  let totalMax = 0

  for (const [name, repoPath] of Object.entries(repos)) {
    if (!fs.existsSync(repoPath)) continue
    const health = calculateHealth(repoPath)
    results[name] = health
    totalScore += health.score
    totalMax += health.maxScore
  }

  if (jsonOutput) {
    console.log(JSON.stringify({ repos: results, totalScore, totalMax }, null, 2))
    return
  }

  for (const [name, health] of Object.entries(results)) {
    console.log(`\n${formatHealthReport(name, health)}`)
  }

  if (Object.keys(results).length > 1) {
    const avgPct = Math.round((totalScore / totalMax) * 100)
    console.log(`\nOverall: ${totalScore}/${totalMax} (${avgPct}%)\n`)
  }
}

async function cmdBadge() {
  const { calculateHealth, generateBadge } = await import('../lib/health.mjs')

  const targetPath = getPositionalArg() || CWD
  const resolved = path.resolve(expandHome(targetPath))
  const outputPath = getFlagValue('--output') || getFlagValue('-o')

  if (!fs.existsSync(resolved)) {
    console.error(`Directory not found: ${resolved}`)
    process.exit(1)
  }

  const health = calculateHealth(resolved)
  const svg = generateBadge(health.score, health.maxScore)

  if (outputPath) {
    fs.writeFileSync(outputPath, svg)
    console.log(`Badge written to ${outputPath}`)
  } else {
    console.log(svg)
  }
}

async function cmdDiff() {
  const { detectDrift, formatDriftReport } = await import('../lib/diff.mjs')
  const jsonOutput = hasFlag('--json')
  const targetPath = getPositionalArg()

  if (targetPath) {
    const resolved = path.resolve(expandHome(targetPath))
    if (!fs.existsSync(resolved)) {
      console.error(`Directory not found: ${resolved}`)
      process.exit(1)
    }
    const drift = detectDrift(resolved)
    if (jsonOutput) {
      console.log(JSON.stringify(drift, null, 2))
    } else {
      console.log(formatDriftReport(resolved, drift))
    }
    return
  }

  // Diff all tracked repos
  const repos = loadReposConfig(CONFIG_PATH)
  if (!repos || Object.keys(repos).length === 0) {
    console.log('No repos configured. Run: forgedocs init')
    return
  }

  const allResults = {}
  for (const [name, repoPath] of Object.entries(repos)) {
    if (!fs.existsSync(repoPath)) continue
    try {
      const drift = detectDrift(repoPath)
      allResults[name] = drift
      if (!jsonOutput) {
        console.log(formatDriftReport(repoPath, drift))
      }
    } catch (err) {
      if (!jsonOutput) {
        console.log(`\n${name}: ${err.message}\n`)
      }
      allResults[name] = { error: err.message }
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify({ repos: allResults }, null, 2))
  }
}

async function cmdLint() {
  const { lintDocs, formatLintReport } = await import('../lib/lint.mjs')
  const jsonOutput = hasFlag('--json')
  const targetPath = getPositionalArg()

  if (targetPath) {
    const resolved = path.resolve(expandHome(targetPath))
    if (!fs.existsSync(resolved)) {
      console.error(`Directory not found: ${resolved}`)
      process.exit(1)
    }
    const results = lintDocs(resolved)
    if (jsonOutput) {
      console.log(JSON.stringify({ name: path.basename(resolved), results }, null, 2))
    } else {
      console.log(formatLintReport(resolved, results))
    }
    const errors = results.filter((r) => r.severity === 'error')
    if (errors.length > 0) process.exit(1)
    return
  }

  // Lint all tracked repos
  const repos = loadReposConfig(CONFIG_PATH)
  if (!repos || Object.keys(repos).length === 0) {
    console.log('No repos configured. Run: forgedocs init')
    return
  }

  const allResults = {}
  let totalErrors = 0
  for (const [name, repoPath] of Object.entries(repos)) {
    if (!fs.existsSync(repoPath)) continue
    const results = lintDocs(repoPath)
    allResults[name] = results
    totalErrors += results.filter((r) => r.severity === 'error').length
    if (!jsonOutput) {
      console.log(formatLintReport(repoPath, results))
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify({ repos: allResults, totalErrors }, null, 2))
  } else if (Object.keys(allResults).length > 1) {
    const totalWarnings = Object.values(allResults)
      .flat()
      .filter((r) => r.severity === 'warn').length
    console.log(`Overall: ${totalErrors} error(s), ${totalWarnings} warning(s)\n`)
  }

  if (totalErrors > 0) process.exit(1)
}

async function cmdExport() {
  const format = getPositionalArg()
  if (!format || !['json', 'html'].includes(format)) {
    console.error('Usage: forgedocs export <json|html> [path]')
    console.error('  forgedocs export json              Export all tracked repos as JSON')
    console.error('  forgedocs export json ~/my-repo    Export a single repo as JSON')
    console.error('  forgedocs export html ~/my-repo    Export a single repo as self-contained HTML')
    process.exit(1)
  }

  const { exportJson, exportAllJson, exportHtml } = await import('../lib/export.mjs')
  const outputPath = getFlagValue('--output') || getFlagValue('-o')

  // Find the second positional arg (after format)
  const pathArg = args.find(
    (a, i) => !a.startsWith('-') && a !== format && (i === 0 || !args[i - 1].match(/^--(output|preset)$/)),
  )

  if (format === 'json') {
    let result
    if (pathArg) {
      const resolved = path.resolve(expandHome(pathArg))
      if (!fs.existsSync(resolved)) {
        console.error(`Directory not found: ${resolved}`)
        process.exit(1)
      }
      result = exportJson(resolved)
    } else {
      const repos = loadReposConfig(CONFIG_PATH)
      if (!repos || Object.keys(repos).length === 0) {
        console.error('No repos configured. Run: forgedocs init')
        process.exit(1)
      }
      result = exportAllJson(repos)
    }

    const json = JSON.stringify(result, null, 2)
    if (outputPath) {
      fs.writeFileSync(outputPath, json)
      console.log(`Exported to ${outputPath}`)
    } else {
      console.log(json)
    }
  }

  if (format === 'html') {
    if (!pathArg) {
      console.error('Usage: forgedocs export html <path> [-o output.html]')
      process.exit(1)
    }
    const resolved = path.resolve(expandHome(pathArg))
    if (!fs.existsSync(resolved)) {
      console.error(`Directory not found: ${resolved}`)
      process.exit(1)
    }

    const html = exportHtml(resolved)
    const out = outputPath || `${path.basename(resolved)}-docs.html`
    fs.writeFileSync(out, html)
    console.log(`Exported to ${out}`)
  }
}

async function cmdWatch() {
  const { watchRepos, formatWatchEvent } = await import('../lib/watch.mjs')

  const repos = loadReposConfig(CONFIG_PATH)
  if (!repos || Object.keys(repos).length === 0) {
    console.log('No repos configured. Run: forgedocs init')
    process.exit(1)
  }

  console.log('\nForgedocs Watch\n')
  console.log(`  Watching ${Object.keys(repos).length} repo(s) for changes...\n`)
  console.log('  Press Ctrl+C to stop.\n')

  const watcher = watchRepos(repos, {
    onEvent(event) {
      console.log(formatWatchEvent(event))
    },
  })

  console.log(`  ${watcher.watcherCount} watcher(s) active.\n`)

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n  Stopped watching.')
    watcher.stop()
    process.exit(0)
  })
}

function cmdInstall() {
  const targetPath = getPositionalArg()
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
    case 'quickstart':
      return cmdQuickstart()
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
    case 'score':
      return cmdScore()
    case 'badge':
      return cmdBadge()
    case 'diff':
      return cmdDiff()
    case 'lint':
      return cmdLint()
    case 'export':
      return cmdExport()
    case 'watch':
      return cmdWatch()
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
