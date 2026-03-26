#!/usr/bin/env node

/**
 * Installs Claude Code commands, skills, and CI workflows into a target repository.
 *
 * Usage:
 *   node scripts/install-commands.mjs /path/to/repo
 *   npm run install-commands -- /path/to/repo
 *
 * What it does:
 *   1. Copies .claude/commands/ templates (doc-init, doc-feature, doc-sync, doc-review, doc-onboard, doc-ci)
 *   2. Copies .claude/skills/doc-review/ template
 *   3. Optionally installs .github/workflows/doc-freshness.yml
 *   4. Reports what was installed
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname))
const TEMPLATES_DIR = path.join(ROOT, 'templates')

const targetArg = process.argv[2]
const forceFlag = process.argv.includes('--force')

if (!targetArg || targetArg === '--help') {
  console.log(`
Usage: npm run install-commands -- /path/to/repo [--force]

Installs Claude Code commands, skills, and CI workflows for
documentation maintenance into any repository.

Options:
  --force    Overwrite existing files (default: skip if exists)

Commands installed:
  /doc-init      Bootstrap full documentation structure
  /doc-feature   Create feature documentation from code exploration
  /doc-sync      Check if docs need updating after code changes
  /doc-review    Full documentation audit with health report
  /doc-onboard   Generate personalized onboarding reading path
  /doc-ci        Generate CI workflow for doc freshness checks

Skills installed:
  doc-review     Automated documentation review skill

CI workflows installed:
  doc-freshness.yml   GitHub Actions workflow for PR doc checks
`)
  process.exit(targetArg === '--help' ? 0 : 1)
}

const targetRepo = path.resolve(targetArg.replace(/^~/, os.homedir()))

if (!fs.existsSync(targetRepo)) {
  console.error(`\u274C Directory not found: ${targetRepo}`)
  process.exit(1)
}

// Check it looks like a repo
const hasGit = fs.existsSync(path.join(targetRepo, '.git'))
if (!hasGit) {
  console.error(`\u26A0\uFE0F  ${targetRepo} doesn't look like a git repository (no .git/)`)
  console.error(`   Proceeding anyway...`)
}

const installed = []
const skipped = []
const updated = []

function installFile(sourcePath, targetPath, label) {
  if (fs.existsSync(targetPath) && !forceFlag) {
    skipped.push(`${label} (already exists)`)
    return
  }

  const wasExisting = fs.existsSync(targetPath)
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.copyFileSync(sourcePath, targetPath)

  if (wasExisting && forceFlag) {
    updated.push(label)
  } else {
    installed.push(label)
  }
}

// Install commands
const commandsSource = path.join(TEMPLATES_DIR, 'claude-commands')
const commandsTarget = path.join(targetRepo, '.claude', 'commands')

for (const file of fs.readdirSync(commandsSource)) {
  if (!file.endsWith('.md')) continue
  installFile(
    path.join(commandsSource, file),
    path.join(commandsTarget, file),
    `.claude/commands/${file}`
  )
}

// Install skills
const skillsSource = path.join(TEMPLATES_DIR, 'claude-skills')
for (const skillDir of fs.readdirSync(skillsSource)) {
  const sourceDir = path.join(skillsSource, skillDir)
  if (!fs.statSync(sourceDir).isDirectory()) continue

  installFile(
    path.join(sourceDir, 'SKILL.md'),
    path.join(targetRepo, '.claude', 'skills', skillDir, 'SKILL.md'),
    `.claude/skills/${skillDir}/SKILL.md`
  )
}

// Install CI workflow
const workflowsSource = path.join(TEMPLATES_DIR, 'github-workflows')
if (fs.existsSync(workflowsSource)) {
  for (const file of fs.readdirSync(workflowsSource)) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue
    installFile(
      path.join(workflowsSource, file),
      path.join(targetRepo, '.github', 'workflows', file),
      `.github/workflows/${file}`
    )
  }
}

// Report
console.log(`\n\uD83D\uDCCB Docsite — ${path.basename(targetRepo)}\n`)

if (installed.length > 0) {
  console.log(`\u2705 Installed:`)
  for (const f of installed) console.log(`   ${f}`)
}

if (updated.length > 0) {
  console.log(`\n\uD83D\uDD04 Updated (--force):`)
  for (const f of updated) console.log(`   ${f}`)
}

if (skipped.length > 0) {
  console.log(`\n\u23ED\uFE0F  Skipped:`)
  for (const f of skipped) console.log(`   ${f}`)
}

const totalChanges = installed.length + updated.length
if (totalChanges === 0 && skipped.length > 0) {
  console.log(`\nAll files already installed. Use --force to update.`)
} else if (totalChanges > 0) {
  console.log(`
Next steps:
  1. cd ${targetRepo}
  2. Open Claude Code
  3. Run /doc-init to generate the full documentation structure
  4. Use /doc-onboard to create an onboarding path
  5. Use /doc-feature to document complex features
  6. Use /doc-review for periodic audits
`)
}
