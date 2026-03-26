#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import readline from 'node:readline'

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname))
const CONFIG_PATH = path.join(ROOT, '.repos.json')
const CONTENT_DIR = path.join(ROOT, 'content')
const USER_CONFIG_PATH = path.join(ROOT, 'docsite.config.mjs')

/** Load user config with defaults */
async function loadConfig() {
  const defaults = {
    scanDirs: ['~/working', '~/projects', '~/code', '~/src', '~/dev'],
    nestedDirs: ['apis', 'packages', 'services', 'apps', 'modules'],
  }

  if (fs.existsSync(USER_CONFIG_PATH)) {
    try {
      const userConfig = (await import(`file://${USER_CONFIG_PATH}`)).default
      return { ...defaults, ...userConfig }
    } catch (err) {
      console.error(`Warning: Could not load docsite.config.mjs: ${err.message}`)
    }
  }

  return defaults
}

/** Expand ~ to home directory */
function expandHome(p) {
  return p.replace(/^~/, os.homedir())
}

/** A valid doc repo has an ARCHITECTURE.md */
function isValidRepo(dir) {
  return fs.existsSync(path.join(dir, 'ARCHITECTURE.md'))
}

/** Check if symlinks are supported (Windows without admin may not support them) */
function symlinkSupported() {
  const testLink = path.join(ROOT, '.symlink-test')
  const testTarget = ROOT
  try {
    fs.symlinkSync(testTarget, testLink)
    fs.unlinkSync(testLink)
    return true
  } catch {
    return false
  }
}

/** Scan a directory for repos (direct children and configurable nested dirs) */
function scanForRepos(searchDir, nestedDirs) {
  const found = {}
  if (!fs.existsSync(searchDir)) return found

  try {
    for (const entry of fs.readdirSync(searchDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      const fullPath = path.join(searchDir, entry.name)

      // Direct repo: ~/working/my-service/
      if (isValidRepo(fullPath)) {
        found[entry.name] = fullPath
      }

      // Nested repos: ~/working/monorepo/<nestedDir>/my-service/
      for (const nestedDir of nestedDirs) {
        const nested = path.join(fullPath, nestedDir)
        if (!fs.existsSync(nested)) continue
        try {
          for (const sub of fs.readdirSync(nested, { withFileTypes: true })) {
            if (!sub.isDirectory()) continue
            const nestedPath = path.join(nested, sub.name)
            if (isValidRepo(nestedPath)) {
              found[sub.name] = nestedPath
            }
          }
        } catch { /* skip unreadable directories */ }
      }
    }
  } catch { /* skip unreadable directories */ }

  return found
}

/**
 * Link repos into content/ directory.
 * Uses symlinks when available, falls back to directory junctions (Windows)
 * or copy for environments where symlinks aren't supported.
 */
function linkRepos(config) {
  if (fs.existsSync(CONTENT_DIR)) {
    fs.rmSync(CONTENT_DIR, { recursive: true })
  }
  fs.mkdirSync(CONTENT_DIR, { recursive: true })

  const useSymlinks = symlinkSupported()

  for (const [name, repoPath] of Object.entries(config)) {
    const linkPath = path.join(CONTENT_DIR, name)
    try {
      if (useSymlinks) {
        fs.symlinkSync(repoPath, linkPath)
      } else if (process.platform === 'win32') {
        // Windows: try junction (doesn't require admin)
        fs.symlinkSync(repoPath, linkPath, 'junction')
      } else {
        // Last resort: copy markdown files only
        copyMarkdownFiles(repoPath, linkPath)
      }
      console.log(`  ${name} -> ${repoPath}${useSymlinks ? '' : ' (copied)'}`)
    } catch (err) {
      console.error(`  Failed to link ${name}: ${err.message}`)
    }
  }
}

/** Copy only markdown files and docs/ directory (fallback for no-symlink environments) */
function copyMarkdownFiles(source, dest) {
  fs.mkdirSync(dest, { recursive: true })

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const srcPath = path.join(source, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory() && entry.name === 'docs') {
      fs.cpSync(srcPath, destPath, { recursive: true })
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

async function askAddMore() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question('Add a repo manually? (path or empty to skip): ', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function setup() {
  const checkOnly = process.argv.includes('--check')
  const addPath = process.argv.find((a, i) => process.argv[i - 1] === '--add')
  const helpFlag = process.argv.includes('--help') || process.argv.includes('-h')

  if (helpFlag) {
    console.log(`
Usage: npm run setup [options]

Options:
  --add <path>   Add a specific repo by path
  --check        Verify symlinks exist (used internally by npm run docs)
  --help, -h     Show this help

Examples:
  npm run setup                          Auto-detect repos
  npm run setup -- --add ~/my-service    Add a specific repo
`)
    process.exit(0)
  }

  const config = await loadConfig()

  // --check: just ensure symlinks exist
  if (checkOnly) {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.log('\nNo repos configured. Run: npm run setup\n')
      process.exit(1)
    }
    const repos = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    let needsRefresh = !fs.existsSync(CONTENT_DIR)
    if (!needsRefresh) {
      for (const name of Object.keys(repos)) {
        if (!fs.existsSync(path.join(CONTENT_DIR, name))) { needsRefresh = true; break }
      }
    }
    if (needsRefresh) {
      console.log('Refreshing links...')
      linkRepos(repos)
    }
    return
  }

  // --add <path>: add a single repo
  if (addPath) {
    const resolved = path.resolve(expandHome(addPath))
    if (!isValidRepo(resolved)) {
      console.log(`No ARCHITECTURE.md found at ${resolved}`)
      process.exit(1)
    }
    const name = path.basename(resolved)
    let repos = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) : {}
    repos[name] = resolved
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(repos, null, 2) + '\n')
    console.log(`Added ${name} -> ${resolved}`)
    linkRepos(repos)
    return
  }

  // Full setup: auto-detect + interactive
  console.log('\nDocsite Setup\n')

  let repos = {}
  if (fs.existsSync(CONFIG_PATH)) {
    repos = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  }

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
  const searchDirs = [
    path.resolve(ROOT, '..'),
    ...config.scanDirs.map(d => expandHome(d)),
  ]

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

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(repos, null, 2) + '\n')
  console.log(`\nConfig saved (${Object.keys(repos).length} repos)`)

  console.log('\nCreating links\n')
  linkRepos(repos)

  console.log(`\nSetup complete! Run: npm run docs\n`)
}

setup().catch(console.error)
