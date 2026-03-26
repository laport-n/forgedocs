/** Debug logging for VitePress config — enabled via DEBUG or VERBOSE env vars */
const debugEnabled = !!(process.env.DEBUG || process.env.VERBOSE)

export function debug(msg: string): void {
  if (debugEnabled) console.error(`[forgedocs] ${msg}`)
}

/** Format a slug into a human-readable name */
export function formatServiceName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
