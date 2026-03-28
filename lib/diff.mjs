import fs from 'node:fs'
import path from 'node:path'
import { debug } from './utils.mjs'

/**
 * Parse the Codemap table from ARCHITECTURE.md.
 * Returns array of { component, path, purpose }.
 */
export function parseCodemap(archContent) {
  const entries = []
  const lines = archContent.split('\n')

  let inCodemap = false
  let headerPassed = false

  for (const line of lines) {
    // Detect start of Codemap section
    if (/^##\s+Codemap/i.test(line)) {
      inCodemap = true
      continue
    }
    // Stop at next section
    if (inCodemap && /^##\s/.test(line)) {
      break
    }
    if (!inCodemap) continue

    // Skip table header and separator
    if (line.includes('---') && line.includes('|')) {
      headerPassed = true
      continue
    }
    if (!headerPassed && line.startsWith('|')) {
      headerPassed = true // this is the header row
      continue
    }

    // Parse table rows
    if (headerPassed && line.startsWith('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean)
      if (cells.length >= 2) {
        entries.push({
          component: cells[0],
          path: cells[1].replace(/`/g, ''),
          purpose: cells[2] || '',
        })
      }
    }
  }

  return entries
}

/**
 * Parse invariants from ARCHITECTURE.md.
 * Returns array of { rule, check }.
 */
export function parseInvariants(archContent) {
  const invariants = []
  const lines = archContent.split('\n')

  let inInvariants = false
  let headerPassed = false

  for (const line of lines) {
    if (/^##\s+(Verifiable )?Invariants/i.test(line) || /^##\s+Architectural Invariants/i.test(line)) {
      inInvariants = true
      continue
    }
    if (inInvariants && /^##\s/.test(line)) break
    if (!inInvariants) continue

    if (line.includes('---') && line.includes('|')) {
      headerPassed = true
      continue
    }
    if (!headerPassed && line.startsWith('|')) {
      headerPassed = true
      continue
    }

    if (headerPassed && line.startsWith('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean)
      if (cells.length >= 2) {
        // Extract command from backticks
        const checkCell = cells[1]
        const cmdMatch = checkCell.match(/`([^`]+)`/)
        if (cmdMatch) {
          invariants.push({
            rule: cells[0],
            check: cmdMatch[1],
          })
        }
      }
    }
  }

  return invariants
}

/**
 * Parse backtick-wrapped file/module paths from the Data Flow section.
 * Returns array of paths found (e.g. ['lib/discovery.mjs', 'content/']).
 */
export function parseDataFlowRefs(archContent) {
  const refs = []
  const lines = archContent.split('\n')

  let inDataFlow = false

  for (const line of lines) {
    if (/^##\s+Data Flow/i.test(line)) {
      inDataFlow = true
      continue
    }
    if (inDataFlow && /^##\s/.test(line)) break
    if (!inDataFlow) continue

    // Extract backtick-wrapped paths that look like file/directory references
    const matches = line.matchAll(/`([^`\s]+\/[^`\s]*)`/g)
    for (const match of matches) {
      const ref = match[1]
      // Skip URLs, commands, and common non-path patterns
      if (ref.includes('://') || ref.startsWith('-') || ref.includes('=')) continue
      refs.push(ref)
    }
  }

  return refs
}

/**
 * Detect drift between ARCHITECTURE.md codemap and actual filesystem.
 * Returns { added: [], removed: [], stale: [], invariantResults: [] }
 */
export function detectDrift(repoPath) {
  const archPath = path.join(repoPath, 'ARCHITECTURE.md')
  if (!fs.existsSync(archPath)) {
    throw new Error('No ARCHITECTURE.md found — run forgedocs quickstart first')
  }

  const content = fs.readFileSync(archPath, 'utf-8')
  const codemap = parseCodemap(content)
  const invariants = parseInvariants(content)

  debug(`Parsed ${codemap.length} codemap entries, ${invariants.length} invariants`)

  // Check codemap paths against filesystem
  const removed = [] // In codemap but missing from filesystem
  const stale = [] // In codemap but marked [To be documented]

  for (const entry of codemap) {
    const entryPath = entry.path.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\/$/, '')
    if (!entryPath || entryPath === '.') continue

    const fullPath = path.join(repoPath, entryPath)
    if (!fs.existsSync(fullPath)) {
      removed.push({ component: entry.component, path: entry.path })
    }
    if (entry.purpose.includes('[To be documented]')) {
      stale.push({ component: entry.component, path: entry.path })
    }
  }

  // Detect new top-level directories not in codemap
  const added = []
  const SKIP = new Set([
    'node_modules',
    'vendor',
    'venv',
    '.venv',
    'target',
    'dist',
    'build',
    'coverage',
    '.git',
    '.next',
    '__pycache__',
    '.pytest_cache',
    '.mypy_cache',
    'tmp',
    'temp',
    'logs',
    '.turbo',
    '.cache',
    '.idea',
    '.vscode',
    'docs',
    'test',
    'tests',
    'spec',
    '__tests__',
    '.github',
    '.claude',
  ])

  const codemapPaths = new Set(
    codemap.map((e) => e.path.replace(/`/g, '').split('/')[0].replace(/\*\*/g, '').replace(/\*/g, '')),
  )

  try {
    const entries = fs.readdirSync(repoPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || SKIP.has(entry.name)) continue
      if (!codemapPaths.has(entry.name)) {
        added.push({ path: `${entry.name}/`, suggestion: 'New directory — not in ARCHITECTURE.md codemap' })
      }
    }
  } catch {
    /* skip */
  }

  // Check Data Flow section for stale path references
  const dataFlowRefs = parseDataFlowRefs(content)
  const staleDataFlowRefs = []
  const codemapPathSet = new Set(codemap.map((e) => e.path.replace(/`/g, '')))

  for (const ref of dataFlowRefs) {
    // Clean the path for filesystem check
    const cleanRef = ref.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\/$/, '')
    if (!cleanRef || cleanRef === '.') continue
    // Skip refs that are already tracked in the codemap (those are checked above)
    if (codemapPathSet.has(ref) || codemapPathSet.has(`${ref}/`) || codemapPathSet.has(cleanRef)) continue
    const fullPath = path.join(repoPath, cleanRef)
    if (!fs.existsSync(fullPath)) {
      staleDataFlowRefs.push({ path: ref, section: 'Data Flow' })
    }
  }

  // Execute invariants
  const invariantResults = []
  for (const inv of invariants) {
    invariantResults.push({
      rule: inv.rule,
      check: inv.check,
      // We don't execute commands here — that's a security boundary.
      // Instead we report them for the user to run.
      status: 'unchecked',
    })
  }

  return { added, removed, stale, staleDataFlowRefs, invariantResults, codemap, invariants }
}

/**
 * Format drift report for terminal display.
 */
export function formatDriftReport(repoPath, drift) {
  const lines = []
  const name = path.basename(repoPath)

  lines.push(`\nDrift Report: ${name}\n`)

  const dataFlowIssues = drift.staleDataFlowRefs?.length || 0
  if (drift.added.length === 0 && drift.removed.length === 0 && drift.stale.length === 0 && dataFlowIssues === 0) {
    lines.push('  No drift detected — codemap matches filesystem.\n')
  }

  if (drift.added.length > 0) {
    lines.push('  New (not in codemap):')
    for (const a of drift.added) {
      lines.push(`    \u2795 ${a.path} — ${a.suggestion}`)
    }
    lines.push('')
  }

  if (drift.removed.length > 0) {
    lines.push('  Removed (in codemap but missing from filesystem):')
    for (const r of drift.removed) {
      lines.push(`    \u274C ${r.component} (${r.path})`)
    }
    lines.push('')
  }

  if (drift.stale.length > 0) {
    lines.push('  Undocumented (marked [To be documented]):')
    for (const s of drift.stale) {
      lines.push(`    \u26A0\uFE0F  ${s.component} (${s.path})`)
    }
    lines.push('')
  }

  if (dataFlowIssues > 0) {
    lines.push('  Stale Data Flow references:')
    for (const r of drift.staleDataFlowRefs) {
      lines.push(`    \u274C \`${r.path}\` — referenced in ${r.section} but path does not exist`)
    }
    lines.push('')
  }

  if (drift.invariantResults.length > 0) {
    lines.push('  Invariants (run manually to verify):')
    for (const inv of drift.invariantResults) {
      lines.push(`    \u2753 ${inv.rule}`)
      lines.push(`      \u2192 ${inv.check}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
