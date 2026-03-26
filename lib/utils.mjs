import os from 'node:os'

/** Expand ~ to home directory */
export function expandHome(p) {
  return p.replace(/^~/, os.homedir())
}

/** Format a slug into a human-readable name */
export function formatServiceName(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Logging utility that respects --verbose flag */
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v')

export function debug(msg) {
  if (verbose) console.error(`[debug] ${msg}`)
}
