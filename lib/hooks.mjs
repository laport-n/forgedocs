import fs from 'node:fs'
import { detectDrift } from './diff.mjs'
import { calculateHealth } from './health.mjs'
import { lintDocs } from './lint.mjs'

/**
 * Pre-push hook: check documentation health and return a concise summary
 * addressed to Claude Code (not the user). Always returns gracefully —
 * never throws, so hooks never break developer flow.
 *
 * @param {string} repoPath - Path to the repository to check
 * @param {{ threshold?: number }} options
 * @returns {string|null} Message for Claude if issues found, null if all clear
 */
export function runPrePushHook(repoPath, { threshold = 80 } = {}) {
  try {
    if (!fs.existsSync(repoPath)) return null

    const lintResults = lintDocs(repoPath)
    const lintErrors = lintResults.filter((r) => r.severity === 'error')

    let drift = { added: [], removed: [], stale: [] }
    try {
      drift = detectDrift(repoPath)
    } catch {
      // No ARCHITECTURE.md or parse error — not actionable
    }

    const health = calculateHealth(repoPath)
    const pct = health.maxScore > 0 ? Math.round((health.score / health.maxScore) * 100) : 100

    const driftIssues = drift.added.length + drift.removed.length

    if (lintErrors.length === 0 && driftIssues === 0 && pct >= threshold) {
      return null
    }

    const lines = [
      '⚠ Documentation issues detected. Run /doc-pr to review and update',
      'documentation automatically, commit the changes, then proceed with the push.',
      '',
      'Issues found:',
    ]

    lines.push(`  - Score: ${health.score}/${health.maxScore} (${pct}%)`)

    if (lintErrors.length > 0) {
      lines.push(`  - Lint errors: ${lintErrors.length}`)
    }

    if (drift.added.length > 0) {
      lines.push(`  - ${drift.added.length} new path(s) not in ARCHITECTURE.md codemap`)
    }

    if (drift.removed.length > 0) {
      lines.push(`  - ${drift.removed.length} removed path(s) still in ARCHITECTURE.md codemap`)
    }

    return lines.join('\n')
  } catch {
    // Hook must never break developer flow
    return null
  }
}
