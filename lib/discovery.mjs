import fs from 'node:fs'
import path from 'node:path'
import { debug } from './utils.mjs'

/** A valid doc repo has an ARCHITECTURE.md */
export function isValidRepo(dir) {
  return fs.existsSync(path.join(dir, 'ARCHITECTURE.md'))
}

/**
 * Scan a directory for repos (direct children and configurable nested dirs).
 * Returns a map of { name: absolutePath }.
 */
export function scanForRepos(searchDir, nestedDirs = []) {
  const found = {}
  if (!fs.existsSync(searchDir)) {
    debug(`Skipping non-existent directory: ${searchDir}`)
    return found
  }

  try {
    for (const entry of fs.readdirSync(searchDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      const fullPath = path.join(searchDir, entry.name)

      // Direct repo: ~/working/my-service/
      if (isValidRepo(fullPath)) {
        found[entry.name] = fullPath
        debug(`Found repo: ${entry.name} at ${fullPath}`)
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
              debug(`Found nested repo: ${sub.name} at ${nestedPath}`)
            }
          }
        } catch (err) {
          debug(`Could not read ${nested}: ${err.message}`)
        }
      }
    }
  } catch (err) {
    debug(`Could not read ${searchDir}: ${err.message}`)
  }

  return found
}
