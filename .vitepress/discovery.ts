import fs from 'node:fs'
import path from 'node:path'
import { debug } from './utils'

/** Discover services from content/ symlinks */
export function discoverServices(contentDir: string): string[] {
  const services: string[] = []
  if (!fs.existsSync(contentDir)) {
    debug('content/ directory not found — no services to discover')
    return services
  }

  for (const entry of fs.readdirSync(contentDir, { withFileTypes: true })) {
    if (entry.isDirectory() || entry.isSymbolicLink()) {
      services.push(entry.name)
      debug(`Discovered service: ${entry.name}`)
    }
  }
  services.sort()
  debug(`Total services discovered: ${services.length}`)
  return services
}

/** Resolve allowed directories from .repos.json for Vite filesystem access */
export function resolveAllowedDirs(repoConfigPath: string): string[] {
  const allowedDirs: string[] = []
  if (!fs.existsSync(repoConfigPath)) return allowedDirs

  try {
    const repos = JSON.parse(fs.readFileSync(repoConfigPath, 'utf-8'))
    for (const dir of Object.values(repos)) {
      if (typeof dir === 'string') allowedDirs.push(dir)
    }
  } catch (e) {
    debug(`Failed to read .repos.json: ${e}`)
  }
  return allowedDirs
}
