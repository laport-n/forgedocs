#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { loadConfig, loadReposConfig, saveReposConfig } from '../lib/config.mjs'
import { isValidRepo, scanForRepos } from '../lib/discovery.mjs'
import { linkRepos } from '../lib/linker.mjs'
import { expandHome } from '../lib/utils.mjs'

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname))
const CONFIG_PATH = path.join(ROOT, '.repos.json')
const CONTENT_DIR = path.join(ROOT, 'content')

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
  const addPath = process.argv.find((_a, i) => process.argv[i - 1] === '--add')
  const helpFlag = process.argv.includes('--help') || process.argv.includes('-h')

  if (helpFlag) {
    console.log(`
Usage: npm run setup [options]

Options:
  --add <path>   Add a specific repo by path
  --check        Verify symlinks exist (used internally by npm run docs)
  --verbose, -v  Show detailed debug output
  --help, -h     Show this help

Examples:
  npm run setup                          Auto-detect repos
  npm run setup -- --add ~/my-service    Add a specific repo
`)
    process.exit(0)
  }

  const config = await loadConfig(ROOT)

  // --check: just ensure symlinks exist
  if (checkOnly) {
    const repos = loadReposConfig(CONFIG_PATH)
    if (!repos) {
      console.log('\nNo repos configured. Run: npm run setup\n')
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
      linkRepos(repos, CONTENT_DIR, ROOT)
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
    const repos = loadReposConfig(CONFIG_PATH) || {}
    repos[name] = resolved
    saveReposConfig(CONFIG_PATH, repos)
    console.log(`Added ${name} -> ${resolved}`)
    linkRepos(repos, CONTENT_DIR, ROOT)
    return
  }

  // Full setup: auto-detect + interactive
  console.log('\nDocsite Setup\n')

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
  const searchDirs = [path.resolve(ROOT, '..'), ...config.scanDirs.map((d) => expandHome(d))]

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
  linkRepos(repos, CONTENT_DIR, ROOT)

  console.log('\nSetup complete! Run: npm run docs\n')
}

setup().catch(console.error)
