import fs from 'node:fs'
import path from 'node:path'

/**
 * Install files from a source directory into a target directory.
 * Returns { installed, updated, skipped } arrays of labels.
 */
export function installTemplates(templatesDir, targetRepo, { force = false } = {}) {
  const installed = []
  const skipped = []
  const updated = []

  function installFile(sourcePath, targetPath, label) {
    if (fs.existsSync(targetPath) && !force) {
      skipped.push(`${label} (already exists)`)
      return
    }

    const wasExisting = fs.existsSync(targetPath)
    fs.mkdirSync(path.dirname(targetPath), { recursive: true })
    fs.copyFileSync(sourcePath, targetPath)

    if (wasExisting && force) {
      updated.push(label)
    } else {
      installed.push(label)
    }
  }

  // Install commands
  const commandsSource = path.join(templatesDir, 'claude-commands')
  const commandsTarget = path.join(targetRepo, '.claude', 'commands')

  for (const file of fs.readdirSync(commandsSource)) {
    if (!file.endsWith('.md')) continue
    installFile(path.join(commandsSource, file), path.join(commandsTarget, file), `.claude/commands/${file}`)
  }

  // Install skills
  const skillsSource = path.join(templatesDir, 'claude-skills')
  for (const skillDir of fs.readdirSync(skillsSource)) {
    const sourceDir = path.join(skillsSource, skillDir)
    if (!fs.statSync(sourceDir).isDirectory()) continue

    installFile(
      path.join(sourceDir, 'SKILL.md'),
      path.join(targetRepo, '.claude', 'skills', skillDir, 'SKILL.md'),
      `.claude/skills/${skillDir}/SKILL.md`,
    )
  }

  // Install CI workflows
  const workflowsSource = path.join(templatesDir, 'github-workflows')
  if (fs.existsSync(workflowsSource)) {
    for (const file of fs.readdirSync(workflowsSource)) {
      if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue
      installFile(
        path.join(workflowsSource, file),
        path.join(targetRepo, '.github', 'workflows', file),
        `.github/workflows/${file}`,
      )
    }
  }

  // Install PR template (append doc checklist if template exists, create if not)
  const prTemplatePath = path.join(targetRepo, '.github', 'PULL_REQUEST_TEMPLATE.md')
  const prTemplateSource = path.join(templatesDir, 'github-pr-template.md')
  if (fs.existsSync(prTemplateSource)) {
    if (fs.existsSync(prTemplatePath)) {
      const existing = fs.readFileSync(prTemplatePath, 'utf-8')
      if (!existing.includes('ARCHITECTURE.md') && !existing.includes('docs/adr/')) {
        const checklist = fs.readFileSync(prTemplateSource, 'utf-8')
        fs.writeFileSync(prTemplatePath, `${existing.trimEnd()}\n\n${checklist}`)
        updated.push('.github/PULL_REQUEST_TEMPLATE.md (added doc checklist)')
      } else {
        skipped.push('.github/PULL_REQUEST_TEMPLATE.md (doc checklist already present)')
      }
    } else {
      installFile(prTemplateSource, prTemplatePath, '.github/PULL_REQUEST_TEMPLATE.md')
    }
  }

  // Configure MCP server in .claude/settings.json
  const settingsPath = path.join(targetRepo, '.claude', 'settings.json')
  let settings = {}
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    } catch {
      /* start fresh if corrupt */
    }
  }

  if (!settings.mcpServers?.forgedocs) {
    settings.mcpServers = settings.mcpServers || {}
    settings.mcpServers.forgedocs = {
      command: 'npx',
      args: ['forgedocs', 'mcp'],
      description: 'Documentation tools — search, health scores, drift detection, codemap, and update suggestions',
    }
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`)
    installed.push('.claude/settings.json (MCP server)')
  } else {
    skipped.push('.claude/settings.json (MCP already configured)')
  }

  return { installed, updated, skipped }
}
