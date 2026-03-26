import fs from 'node:fs'
import path from 'node:path'
import { debug } from './utils.mjs'

/**
 * Watch tracked repos for changes that may require documentation updates.
 * Uses fs.watch (no external dependencies).
 *
 * Watches for:
 * - New directories in repo root (may need codemap update)
 * - Deleted directories referenced in codemap
 * - Changes to key config files (package.json, Cargo.toml, go.mod, etc.)
 */
export function watchRepos(repos, { onEvent, debounceMs = 2000 } = {}) {
  const watchers = []
  const timers = new Map()

  // Directories/files to watch at repo root level
  const WATCH_PATTERNS = ['package.json', 'Cargo.toml', 'go.mod', 'requirements.txt', 'pyproject.toml', 'Gemfile']

  function emit(event) {
    // Debounce per repo+event type
    const key = `${event.repo}:${event.type}:${event.path}`
    if (timers.has(key)) {
      clearTimeout(timers.get(key))
    }
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key)
        if (onEvent) {
          onEvent(event)
        }
      }, debounceMs),
    )
  }

  for (const [name, repoPath] of Object.entries(repos)) {
    if (!fs.existsSync(repoPath)) {
      debug(`Skipping watch for ${name}: path not found`)
      continue
    }

    try {
      // Watch repo root for new/deleted directories
      const rootWatcher = fs.watch(repoPath, { persistent: true }, (eventType, filename) => {
        if (!filename || filename.startsWith('.')) return

        const fullPath = path.join(repoPath, filename)

        // Check if it's a directory creation/deletion
        const isDir = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()
        const isConfigFile = WATCH_PATTERNS.includes(filename)

        if (eventType === 'rename' && isDir) {
          emit({
            type: 'directory-change',
            repo: name,
            path: filename,
            message: `Directory "${filename}" changed — ARCHITECTURE.md codemap may need update`,
          })
        }

        if (isConfigFile) {
          emit({
            type: 'config-change',
            repo: name,
            path: filename,
            message: `${filename} changed — dependencies may have changed`,
          })
        }
      })
      watchers.push(rootWatcher)

      // Watch ARCHITECTURE.md for external modifications
      const archPath = path.join(repoPath, 'ARCHITECTURE.md')
      if (fs.existsSync(archPath)) {
        const archWatcher = fs.watch(archPath, { persistent: true }, () => {
          emit({
            type: 'doc-change',
            repo: name,
            path: 'ARCHITECTURE.md',
            message: 'ARCHITECTURE.md modified',
          })
        })
        watchers.push(archWatcher)
      }

      // Watch docs/ directory for changes
      const docsDir = path.join(repoPath, 'docs')
      if (fs.existsSync(docsDir)) {
        const docsWatcher = fs.watch(docsDir, { recursive: true, persistent: true }, (_eventType, filename) => {
          if (!filename?.endsWith('.md')) return
          emit({
            type: 'doc-change',
            repo: name,
            path: `docs/${filename}`,
            message: `Documentation file changed: docs/${filename}`,
          })
        })
        watchers.push(docsWatcher)
      }

      debug(`Watching: ${name} (${repoPath})`)
    } catch (err) {
      debug(`Failed to watch ${name}: ${err.message}`)
    }
  }

  // Return a stop function
  return {
    stop() {
      for (const w of watchers) {
        try {
          w.close()
        } catch {
          /* */
        }
      }
      for (const t of timers.values()) {
        clearTimeout(t)
      }
      watchers.length = 0
      timers.clear()
    },
    watcherCount: watchers.length,
  }
}

/**
 * Format a watch event for terminal display.
 */
export function formatWatchEvent(event) {
  const icons = {
    'directory-change': '\u{1F4C1}',
    'config-change': '\u{1F527}',
    'doc-change': '\u{1F4DD}',
  }
  const icon = icons[event.type] || '\u2022'
  const time = new Date().toLocaleTimeString()
  return `[${time}] ${icon} ${event.repo}: ${event.message}`
}
