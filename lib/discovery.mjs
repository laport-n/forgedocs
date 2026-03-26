import fs from 'node:fs'
import path from 'node:path'
import { debug } from './utils.mjs'

/** A valid doc repo has an ARCHITECTURE.md */
export function isValidRepo(dir) {
  return fs.existsSync(path.join(dir, 'ARCHITECTURE.md'))
}

/**
 * Scan a directory for repos recursively up to a given depth.
 * Returns a map of { name: absolutePath }.
 */
export function scanForRepos(searchDir, nestedDirs = [], { maxDepth = 3 } = {}) {
  const found = {}
  if (!fs.existsSync(searchDir)) {
    debug(`Skipping non-existent directory: ${searchDir}`)
    return found
  }

  function scan(dir, depth) {
    if (depth > maxDepth) return
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue
        // Skip common non-project directories
        if (['node_modules', 'vendor', 'venv', '.venv', 'target', 'dist', 'build', 'coverage', 'content'].includes(entry.name)) {
          continue
        }
        const fullPath = path.join(dir, entry.name)

        if (isValidRepo(fullPath)) {
          found[entry.name] = fullPath
          debug(`Found repo: ${entry.name} at ${fullPath}`)
          // Don't recurse into found repos — they may have nested dirs with ARCHITECTURE.md
          continue
        }

        // Check nested dirs pattern (e.g. monorepo/services/my-svc/)
        for (const nestedDir of nestedDirs) {
          if (entry.name === nestedDir) {
            try {
              for (const sub of fs.readdirSync(fullPath, { withFileTypes: true })) {
                if (!sub.isDirectory()) continue
                const nestedPath = path.join(fullPath, sub.name)
                if (isValidRepo(nestedPath)) {
                  found[sub.name] = nestedPath
                  debug(`Found nested repo: ${sub.name} at ${nestedPath}`)
                }
              }
            } catch (err) {
              debug(`Could not read ${fullPath}: ${err.message}`)
            }
          }
        }

        // Recurse deeper
        if (depth < maxDepth) {
          scan(fullPath, depth + 1)
        }
      }
    } catch (err) {
      debug(`Could not read ${dir}: ${err.message}`)
    }
  }

  scan(searchDir, 1)
  return found
}

/**
 * Auto-detect common directories on the system where repos might live.
 * Returns an array of existing directory paths.
 */
export function detectScanDirs(homeDir) {
  const candidates = [
    'working',
    'projects',
    'code',
    'src',
    'dev',
    'repos',
    'perso',
    'personal',
    'work',
    'git',
    'github',
    'workspace',
    'Development',
    'Documents/projects',
    'Documents/code',
    'Documents/dev',
  ]

  const found = []
  for (const candidate of candidates) {
    const fullPath = path.join(homeDir, candidate)
    if (fs.existsSync(fullPath)) {
      found.push(fullPath)
      debug(`Detected scan directory: ${fullPath}`)
    }
  }
  return found
}
