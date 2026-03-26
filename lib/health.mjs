import fs from 'node:fs'
import path from 'node:path'
import { debug } from './utils.mjs'

/**
 * Scoring weights — each check contributes to a score out of 100.
 * Categories:
 *   - Structure (40 points): presence of key files
 *   - Quality (30 points): invariants, freshness, completeness
 *   - Depth (30 points): features, ADRs, glossary terms
 */
const CHECKS = [
  // Structure (40 pts)
  { id: 'architecture', label: 'ARCHITECTURE.md present', points: 15, category: 'Structure' },
  { id: 'readme', label: 'README.md present', points: 10, category: 'Structure' },
  { id: 'claude', label: 'CLAUDE.md present', points: 5, category: 'Structure' },
  { id: 'docs-dir', label: 'docs/ directory exists', points: 5, category: 'Structure' },
  { id: 'service-map', label: 'docs/service-map.md present', points: 5, category: 'Structure' },

  // Quality (30 pts)
  { id: 'invariants', label: 'Verifiable invariants defined', points: 10, category: 'Quality' },
  { id: 'codemap', label: 'Codemap table present', points: 10, category: 'Quality' },
  { id: 'service-map-fresh', label: 'Service map not stale (< 90 days)', points: 5, category: 'Quality' },
  { id: 'security', label: 'docs/security.md present', points: 5, category: 'Quality' },

  // Depth (30 pts)
  { id: 'glossary', label: 'docs/glossary.md with terms', points: 10, category: 'Depth' },
  { id: 'features', label: 'Feature documentation (1+ files)', points: 10, category: 'Depth' },
  { id: 'adrs', label: 'ADR documentation (1+ files)', points: 10, category: 'Depth' },
]

/**
 * Calculate the doc health score for a single repo.
 * Returns { score, maxScore, checks: [{ id, label, points, earned, status, detail }] }
 */
export function calculateHealth(repoPath) {
  const results = []

  for (const check of CHECKS) {
    const result = { ...check, earned: 0, status: 'fail', detail: '' }

    switch (check.id) {
      case 'architecture': {
        const exists = fs.existsSync(path.join(repoPath, 'ARCHITECTURE.md'))
        if (exists) {
          result.earned = check.points
          result.status = 'pass'
        } else {
          result.detail = 'Missing — run /doc-init or forgedocs quickstart'
        }
        break
      }
      case 'readme': {
        const exists = fs.existsSync(path.join(repoPath, 'README.md'))
        if (exists) {
          result.earned = check.points
          result.status = 'pass'
        } else {
          result.detail = 'Missing'
        }
        break
      }
      case 'claude': {
        const exists = fs.existsSync(path.join(repoPath, 'CLAUDE.md'))
        if (exists) {
          result.earned = check.points
          result.status = 'pass'
        } else {
          result.detail = 'Missing — AI agents lack context'
        }
        break
      }
      case 'docs-dir': {
        const exists = fs.existsSync(path.join(repoPath, 'docs'))
        if (exists) {
          result.earned = check.points
          result.status = 'pass'
        } else {
          result.detail = 'Missing'
        }
        break
      }
      case 'service-map': {
        const exists = fs.existsSync(path.join(repoPath, 'docs', 'service-map.md'))
        if (exists) {
          result.earned = check.points
          result.status = 'pass'
        } else {
          result.detail = 'Missing'
        }
        break
      }
      case 'invariants': {
        const archPath = path.join(repoPath, 'ARCHITECTURE.md')
        if (fs.existsSync(archPath)) {
          const content = fs.readFileSync(archPath, 'utf-8')
          // Look for a table with check/verification column containing backtick commands
          const invariantMatches = content.match(/\|[^|]*\|[^|]*`[^`]+`[^|]*\|/g)
          if (invariantMatches && invariantMatches.length > 0) {
            result.earned = check.points
            result.status = 'pass'
            result.detail = `${invariantMatches.length} invariant(s) found`
          } else {
            result.detail = 'No verifiable invariants in ARCHITECTURE.md'
          }
        } else {
          result.detail = 'No ARCHITECTURE.md'
        }
        break
      }
      case 'codemap': {
        const archPath = path.join(repoPath, 'ARCHITECTURE.md')
        if (fs.existsSync(archPath)) {
          const content = fs.readFileSync(archPath, 'utf-8')
          const hasCodemap = /## Codemap/i.test(content) && /\|[^|]+\|[^|]+\|[^|]+\|/g.test(content)
          if (hasCodemap) {
            result.earned = check.points
            result.status = 'pass'
          } else {
            result.detail = 'No Codemap section found'
          }
        } else {
          result.detail = 'No ARCHITECTURE.md'
        }
        break
      }
      case 'service-map-fresh': {
        const smPath = path.join(repoPath, 'docs', 'service-map.md')
        if (fs.existsSync(smPath)) {
          const content = fs.readFileSync(smPath, 'utf-8')
          const match = content.match(/Last verified:\s*(\d{4}-\d{2}-\d{2})/)
          if (match) {
            const lastDate = new Date(match[1])
            const daysOld = Math.floor((Date.now() - lastDate.getTime()) / 86400000)
            if (daysOld <= 90) {
              result.earned = check.points
              result.status = 'pass'
              result.detail = `Verified ${daysOld} day(s) ago`
            } else {
              result.detail = `Stale — last verified ${daysOld} days ago (max 90)`
              result.status = 'warn'
            }
          } else {
            result.earned = check.points
            result.status = 'pass'
            result.detail = 'No "Last verified" date (assumed fresh)'
          }
        } else {
          result.detail = 'No service-map.md'
        }
        break
      }
      case 'security': {
        const exists = fs.existsSync(path.join(repoPath, 'docs', 'security.md'))
        if (exists) {
          result.earned = check.points
          result.status = 'pass'
        } else {
          result.detail = 'Missing'
        }
        break
      }
      case 'glossary': {
        const gPath = path.join(repoPath, 'docs', 'glossary.md')
        if (fs.existsSync(gPath)) {
          const content = fs.readFileSync(gPath, 'utf-8')
          // Count table rows (excluding header and separator)
          const rows = content.split('\n').filter((l) => l.startsWith('|') && !l.includes('---'))
          const termCount = Math.max(0, rows.length - 1) // subtract header
          if (termCount > 0) {
            result.earned = check.points
            result.status = 'pass'
            result.detail = `${termCount} term(s) defined`
          } else {
            result.detail = 'Glossary exists but has no terms'
            result.status = 'warn'
          }
        } else {
          result.detail = 'Missing'
        }
        break
      }
      case 'features': {
        const featDir = path.join(repoPath, 'docs', 'features')
        if (fs.existsSync(featDir)) {
          const count = fs.readdirSync(featDir).filter((f) => f.endsWith('.md')).length
          if (count > 0) {
            result.earned = check.points
            result.status = 'pass'
            result.detail = `${count} feature doc(s)`
          } else {
            result.detail = 'Directory exists but no feature docs'
            result.status = 'warn'
          }
        } else {
          result.detail = 'No docs/features/ directory'
        }
        break
      }
      case 'adrs': {
        const adrDir = path.join(repoPath, 'docs', 'adr')
        if (fs.existsSync(adrDir)) {
          const count = fs.readdirSync(adrDir).filter((f) => f.endsWith('.md') && f !== 'README.md').length
          if (count > 0) {
            result.earned = check.points
            result.status = 'pass'
            result.detail = `${count} ADR(s)`
          } else {
            result.detail = 'Directory exists but no ADRs'
            result.status = 'warn'
          }
        } else {
          result.detail = 'No docs/adr/ directory'
        }
        break
      }
    }

    results.push(result)
  }

  const score = results.reduce((sum, r) => sum + r.earned, 0)
  const maxScore = CHECKS.reduce((sum, c) => sum + c.points, 0)

  debug(`Health score for ${repoPath}: ${score}/${maxScore}`)

  return { score, maxScore, checks: results }
}

/**
 * Generate an SVG badge for the doc health score.
 * Returns SVG string.
 */
export function generateBadge(score, maxScore = 100) {
  const pct = Math.round((score / maxScore) * 100)
  const color = pct >= 80 ? '#4c1' : pct >= 60 ? '#dfb317' : pct >= 40 ? '#fe7d37' : '#e05d44'
  const label = 'doc health'
  const value = `${pct}%`

  const labelWidth = label.length * 6.5 + 10
  const valueWidth = value.length * 7 + 10
  const totalWidth = labelWidth + valueWidth

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`
}

/**
 * Format health results for terminal display.
 */
export function formatHealthReport(name, health) {
  const { score, maxScore, checks } = health
  const pct = Math.round((score / maxScore) * 100)

  // Progress bar
  const barLength = 20
  const filled = Math.round((pct / 100) * barLength)
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barLength - filled)

  const lines = []
  lines.push(`Doc Health: ${name} ${bar} ${score}/${maxScore} (${pct}%)`)
  lines.push('')

  // Group by category
  const categories = {}
  for (const check of checks) {
    if (!categories[check.category]) categories[check.category] = []
    categories[check.category].push(check)
  }

  for (const [cat, catChecks] of Object.entries(categories)) {
    const catScore = catChecks.reduce((s, c) => s + c.earned, 0)
    const catMax = catChecks.reduce((s, c) => s + c.points, 0)
    lines.push(`  ${cat} (${catScore}/${catMax}):`)
    for (const c of catChecks) {
      const icon = c.status === 'pass' ? '\u2705' : c.status === 'warn' ? '\u26A0\uFE0F' : '\u274C'
      const detail = c.detail ? ` — ${c.detail}` : ''
      lines.push(`    ${icon} ${c.label} (${c.earned}/${c.points})${detail}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
