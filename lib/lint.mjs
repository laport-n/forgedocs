import fs from 'node:fs'
import path from 'node:path'
import { parseCodemap, parseInvariants } from './diff.mjs'

/**
 * Lint documentation for a repository.
 * Returns array of { id, severity, file, message, fix }.
 * Severity: "error" | "warn" | "info"
 */
export function lintDocs(repoPath) {
  const results = []

  function add(id, severity, file, message, fix) {
    results.push({ id, severity, file, message, fix: fix || null })
  }

  // Rule 1: Broken codemap references
  const archPath = path.join(repoPath, 'ARCHITECTURE.md')
  if (fs.existsSync(archPath)) {
    const content = fs.readFileSync(archPath, 'utf-8')
    const codemap = parseCodemap(content)

    for (const entry of codemap) {
      const entryPath = entry.path.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\/$/, '')
      if (!entryPath || entryPath === '.') continue
      const fullPath = path.join(repoPath, entryPath)
      if (!fs.existsSync(fullPath)) {
        add(
          'broken-ref',
          'error',
          'ARCHITECTURE.md',
          `Codemap references "${entry.path}" but path does not exist`,
          `Remove "${entry.component}" from codemap or create the path`,
        )
      }
    }

    // Rule 2: Stale placeholders in ARCHITECTURE.md (only match actual placeholders, not quoted references)
    const placeholders = findRealPlaceholders(content)
    if (placeholders) {
      add(
        'stale-placeholder',
        'error',
        'ARCHITECTURE.md',
        `${placeholders.length} placeholder(s) found: [To be documented]`,
        'Fill in placeholders or run /doc-init to generate content',
      )
    }

    // Rule 3: Invariant check syntax
    const invariants = parseInvariants(content)
    for (const inv of invariants) {
      if (
        inv.check.includes('echo') &&
        (inv.check.includes('Add') || inv.check.includes('TODO') || inv.check.includes('todo'))
      ) {
        add(
          'placeholder-invariant',
          'error',
          'ARCHITECTURE.md',
          `Invariant "${inv.rule}" has a placeholder check: \`${inv.check}\``,
          'Replace with a real verification command',
        )
      }
      if (!inv.check.trim()) {
        add('empty-invariant', 'error', 'ARCHITECTURE.md', `Invariant "${inv.rule}" has an empty check command`)
      }
    }

    if (invariants.length === 0 && codemap.length > 0) {
      add(
        'no-invariants',
        'warn',
        'ARCHITECTURE.md',
        'Codemap exists but no verifiable invariants defined',
        'Add invariants with shell verification commands',
      )
    }

    // Rule 4: ARCHITECTURE.md line count
    const lineCount = content.split('\n').length
    if (lineCount > 200) {
      add(
        'arch-too-long',
        'warn',
        'ARCHITECTURE.md',
        `${lineCount} lines — ARCHITECTURE.md should be a map, not a manual (target: <150 lines)`,
        'Move detailed content to docs/features/ or docs/adr/',
      )
    }
  } else {
    add(
      'no-architecture',
      'error',
      'ARCHITECTURE.md',
      'Missing — repo will not appear in documentation site',
      'Run `forgedocs quickstart` or `/doc-init`',
    )
  }

  // Rule 5: CLAUDE.md checks
  const claudePath = path.join(repoPath, 'CLAUDE.md')
  if (fs.existsSync(claudePath)) {
    const content = fs.readFileSync(claudePath, 'utf-8')

    // Check for navigation-first structure
    const hasWhatToRead = /## What to read first/i.test(content)
    const hasWhereLive = /## Where things live/i.test(content)
    const hasNeverDo = /## What to never do/i.test(content)
    const hasHowToRun = /## How to run/i.test(content)

    if (!hasWhatToRead) {
      add(
        'claude-missing-section',
        'warn',
        'CLAUDE.md',
        'Missing "What to read first" section',
        'Add navigation pointers to key documentation files',
      )
    }
    if (!hasWhereLive) {
      add(
        'claude-missing-section',
        'warn',
        'CLAUDE.md',
        'Missing "Where things live" section',
        'Add directory/file listings',
      )
    }
    if (!hasNeverDo) {
      add(
        'claude-missing-section',
        'warn',
        'CLAUDE.md',
        'Missing "What to never do" section',
        'Add anti-patterns and forbidden practices',
      )
    }
    if (!hasHowToRun) {
      add('claude-missing-section', 'warn', 'CLAUDE.md', 'Missing "How to run" section', 'Add test/lint/dev commands')
    }

    // Check for stale placeholders
    const placeholders = findRealPlaceholders(content)
    if (placeholders) {
      add(
        'stale-placeholder',
        'error',
        'CLAUDE.md',
        `${placeholders.length} placeholder(s) found`,
        'Fill in sections — placeholders provide no value to AI agents',
      )
    }

    // CLAUDE.md should be concise
    const lineCount = content.split('\n').length
    if (lineCount > 100) {
      add(
        'claude-too-long',
        'warn',
        'CLAUDE.md',
        `${lineCount} lines — CLAUDE.md should be navigation-only (target: <100 lines)`,
        'Move detailed rules to .claude/rules/ or ARCHITECTURE.md',
      )
    }
  } else {
    add(
      'no-claude',
      'warn',
      'CLAUDE.md',
      'Missing — AI agents lack context for this codebase',
      'Run `forgedocs quickstart` or `/doc-init`',
    )
  }

  // Rule 6: README.md
  const readmePath = path.join(repoPath, 'README.md')
  if (!fs.existsSync(readmePath)) {
    add(
      'no-readme',
      'error',
      'README.md',
      'Missing — service will show 404 in documentation site',
      'Create README.md with title, overview, setup instructions',
    )
  }

  // Rule 7: Service map freshness
  const serviceMapPath = path.join(repoPath, 'docs', 'service-map.md')
  if (fs.existsSync(serviceMapPath)) {
    const content = fs.readFileSync(serviceMapPath, 'utf-8')
    const dateMatch = content.match(/Last verified:\s*(\d{4}-\d{2}-\d{2})/)
    if (!dateMatch) {
      add(
        'service-map-no-date',
        'warn',
        'docs/service-map.md',
        'No "Last verified" date found',
        'Add "Last verified: YYYY-MM-DD" to the document',
      )
    } else {
      const lastDate = new Date(dateMatch[1])
      const daysOld = Math.floor((Date.now() - lastDate.getTime()) / 86400000)
      if (daysOld > 90) {
        add(
          'service-map-stale',
          'warn',
          'docs/service-map.md',
          `Last verified ${daysOld} days ago (max 90)`,
          'Review the service map and update the "Last verified" date',
        )
      }
    }
  }

  // Rule 8: Feature docs structure
  const featuresDir = path.join(repoPath, 'docs', 'features')
  if (fs.existsSync(featuresDir)) {
    for (const file of fs.readdirSync(featuresDir).filter((f) => f.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(featuresDir, file), 'utf-8')
      if (!/## Invariants|## Invariants —/i.test(content)) {
        add(
          'feature-no-invariants',
          'warn',
          `docs/features/${file}`,
          'Missing "Invariants" section',
          'Add invariants that must hold for this feature',
        )
      }
      if (!/## (Failure Modes|Known failure)/i.test(content)) {
        add(
          'feature-no-failures',
          'info',
          `docs/features/${file}`,
          'Missing "Failure Modes" section',
          'Document what can go wrong and how it behaves',
        )
      }
      const placeholders = findRealPlaceholders(content)
      if (placeholders) {
        add(
          'stale-placeholder',
          'error',
          `docs/features/${file}`,
          `${placeholders.length} placeholder(s) found`,
          'Fill in all [To be documented] sections',
        )
      }
    }
  }

  // Rule 9: ADR format check
  const adrDir = path.join(repoPath, 'docs', 'adr')
  if (fs.existsSync(adrDir)) {
    for (const file of fs.readdirSync(adrDir).filter((f) => f.endsWith('.md') && f !== 'README.md')) {
      const content = fs.readFileSync(path.join(adrDir, file), 'utf-8')
      if (!/## Rules/i.test(content)) {
        add(
          'adr-no-rules',
          'warn',
          `docs/adr/${file}`,
          'Missing "Rules" section — ADRs should include actionable rules',
          'Add rules developers must follow as a result of this decision',
        )
      }
      if (!/## Trade-offs/i.test(content) && !/## Consequences/i.test(content)) {
        add(
          'adr-no-tradeoffs',
          'info',
          `docs/adr/${file}`,
          'Missing "Trade-offs" section',
          'Document what constraints this decision imposes',
        )
      }
    }
  }

  // Rule 10: Broken file references in docs
  // Check docs/ directory AND root-level doc files (ARCHITECTURE.md, README.md, CLAUDE.md)
  const rootDocFiles = ['ARCHITECTURE.md', 'README.md', 'CLAUDE.md']
    .map((f) => path.join(repoPath, f))
    .filter((f) => fs.existsSync(f))
  const docsDir = path.join(repoPath, 'docs')
  const docsMdFiles = fs.existsSync(docsDir) ? collectMdFiles(docsDir) : []
  const allDocFiles = [...rootDocFiles, ...docsMdFiles]

  for (const mdFile of allDocFiles) {
    const content = fs.readFileSync(mdFile, 'utf-8')
    const relFile = path.relative(repoPath, mdFile)
    // Find backtick-wrapped file paths that look like source references
    const pathRefs = content.matchAll(
      /`((?:src|lib|app|bin|pkg|internal|cmd|scripts|extensions|templates|\.vitepress)\/[^`\s]+)`/g,
    )
    for (const match of pathRefs) {
      // Strip :symbol suffix (e.g. lib/diff.mjs:parseCodemap → lib/diff.mjs)
      const refPath = match[1].replace(/:[a-zA-Z_]\w*$/, '')
      // Strip glob patterns for existence check (e.g. src/**/*.controller.ts → src/)
      const checkPath = refPath.includes('*') ? refPath.split('*')[0].replace(/\/$/, '') : refPath
      if (!checkPath || checkPath === '.') continue
      if (!fs.existsSync(path.join(repoPath, checkPath))) {
        add(
          'broken-ref',
          'error',
          relFile,
          `References \`${refPath}\` but file does not exist`,
          'Update the reference or remove it',
        )
      }
    }
  }

  return results
}

/**
 * Find real [To be documented] placeholders, excluding:
 * - Lines inside code blocks (```)
 * - Lines where it's a quoted reference (preceded by backtick or inside a description of behavior)
 */
function findRealPlaceholders(content) {
  const lines = content.split('\n')
  let inCodeBlock = false
  const matches = []
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue
    // Skip lines where [To be documented] is inside backticks (quoted)
    if (/`[^`]*\[To be documented[^\]]*\][^`]*`/.test(line)) continue
    // Skip lines that describe the behavior (e.g., "Marks unknowns as [To be documented]")
    if (/marks?\s+(unknowns?|entries?|items?)\s+as/i.test(line)) continue
    if (/marked\s+\[To be documented\]/i.test(line)) continue
    if (/flag(ged)?\s+as\s+/i.test(line)) continue
    const lineMatches = line.match(/\[To be documented[^\]]*\]/g)
    if (lineMatches) matches.push(...lineMatches)
  }
  return matches.length > 0 ? matches : null
}

function collectMdFiles(dir) {
  const files = []
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath)
      } else if (entry.isDirectory()) {
        files.push(...collectMdFiles(fullPath))
      }
    }
  } catch {
    /* skip unreadable */
  }
  return files
}

/**
 * Format lint results for terminal display.
 */
export function formatLintReport(repoPath, results) {
  const name = path.basename(repoPath)
  const lines = [`\nLint: ${name}\n`]

  const errors = results.filter((r) => r.severity === 'error')
  const warnings = results.filter((r) => r.severity === 'warn')
  const infos = results.filter((r) => r.severity === 'info')

  if (results.length === 0) {
    lines.push('  No issues found.\n')
    return lines.join('\n')
  }

  if (errors.length > 0) {
    lines.push('  Errors:')
    for (const r of errors) {
      lines.push(`    \u274C ${r.file}: ${r.message}`)
      if (r.fix) lines.push(`       Fix: ${r.fix}`)
    }
    lines.push('')
  }

  if (warnings.length > 0) {
    lines.push('  Warnings:')
    for (const r of warnings) {
      lines.push(`    \u26A0\uFE0F  ${r.file}: ${r.message}`)
      if (r.fix) lines.push(`       Fix: ${r.fix}`)
    }
    lines.push('')
  }

  if (infos.length > 0) {
    lines.push('  Info:')
    for (const r of infos) {
      lines.push(`    \u2139\uFE0F  ${r.file}: ${r.message}`)
      if (r.fix) lines.push(`       Fix: ${r.fix}`)
    }
    lines.push('')
  }

  lines.push(`  Summary: ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info(s)`)
  lines.push('')

  return lines.join('\n')
}
