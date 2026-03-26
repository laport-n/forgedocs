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

  // Configure MCP server in .claude/settings.json
  const settingsPath = path.join(targetRepo, '.claude', 'settings.json')
  const forgedocsBin = 'npx forgedocs mcp'
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
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
    installed.push('.claude/settings.json (MCP server)')
  } else {
    skipped.push('.claude/settings.json (MCP already configured)')
  }

  return { installed, updated, skipped }
}
